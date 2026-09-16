import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { WebSocketExceptionFilter } from '../../../common/filters/websocket-exception.filter';
import { redisKeys } from '../../../core/redis/redis-keys';
import { WebSocketJwtGuard } from '../../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketValidationPipe } from '../../../common/websocket/pipes/websocket-validation.pipe';
import { WebSocketErrorNormalizer } from '../../../common/websocket/error/websocket-error.normalizer';
import {
  WEB_SOCKET_ALLOWED_ORIGINS,
  WS_MAX_BUFFER_BYTES,
} from '../../../common/websocket/websocket-origins';

import { CallAbuseProtectionService } from '../services/call-abuse-protection.service';
import { CallMetricsService } from '../services/call-metrics.service';
import { CallSystemMessageService } from '../services/call-system-message.service';
import {
  CALL_EVENT_ACCEPT,
  CALL_EVENT_CAMERA_OFF,
  CALL_EVENT_CAMERA_ON,
  CALL_EVENT_CANCEL,
  CALL_EVENT_CREATE,
  CALL_EVENT_END,
  CALL_EVENT_WEBRTC_ICE_CANDIDATE,
  CALL_EVENT_MUTE,
  CALL_EVENT_PARTICIPANT_JOINED,
  CALL_EVENT_PARTICIPANT_LEFT,
  CALL_EVENT_STATE,
  CALL_EVENT_REJECT,
  CALL_EVENT_RING,
  CALL_EVENT_UNMUTE,
  CALL_EVENT_WEBRTC_ANSWER,
  CALL_EVENT_WEBRTC_OFFER,
  CALL_ROOM,
  CALL_WS_RATE_LIMIT,
  CALL_WINDOW_SECONDS,
  CALL_CLEANUP_INTERVAL_SECONDS,
  callRoom,
  callParticipantRoom,
} from '../constants/calling.constants';

import { CallCommandService } from '../services/call-command.service';
import { CallQueryService } from '../services/call-query.service';
import { CallAuthorizationService } from '../services/call-authorization.service';
import { CallingNotificationPublisher } from '../services/calling-notification-publisher.service';
import { CallEventsService } from '../services/call-events.service';
import { CallingCleanupService } from '../services/calling-cleanup.service';
import { IceServerProvider } from '../services/ice-server-provider';
import { CallScope } from '../types/calling.types';
import {
  CreateCallRequest,
  GetActiveCallRequest,
  IceCandidateRequest,
  JoinCallRequest,
  LeaveCallRequest,
  MuteRequest,
  UnmuteRequest,
  CameraOnRequest,
  CameraOffRequest,
  SignalRequest,
} from '../dto/request/index';

@WebSocketGateway({
  namespace: '/calling',
  cors: { origin: WEB_SOCKET_ALLOWED_ORIGINS },
  maxHttpBufferSize: WS_MAX_BUFFER_BYTES,
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class CallingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy
{
  private readonly logger = new Logger(CallingGateway.name);

  private cleanupTimer?: NodeJS.Timeout;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly rateLimit: WebSocketRateLimitService,
    private readonly commandService: CallCommandService,
    private readonly queryService: CallQueryService,
    private readonly authorization: CallAuthorizationService,
    private readonly notificationPublisher: CallingNotificationPublisher,
    private readonly callEvents: CallEventsService,
    private readonly cleanupService: CallingCleanupService,
    private readonly iceServerProvider: IceServerProvider,
    private readonly connectionAuth: WebSocketConnectionAuthService,
    private readonly connectionLimit: WebSocketConnectionLimitService,
    private readonly abuseProtection: CallAbuseProtectionService,
    private readonly metrics: CallMetricsService,
    private readonly systemMessages: CallSystemMessageService,
  ) {}

  afterInit() {
    this.cleanupTimer = setInterval(() => {
      void this.sweepStaleCalls().catch((error) => {
        this.logger.error('Calling stale-call sweep failed.', error);
      });
    }, CALL_CLEANUP_INTERVAL_SECONDS * 1000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private async sweepStaleCalls(): Promise<void> {
    const expired = await this.cleanupService.sweep();
    for (const result of expired) {
      this.server.to(callRoom(result.callId)).emit(CALL_EVENT_END, {
        callId: result.callId,
        endedBy: result.creatorUserId,
        reason: 'ring-timeout',
      });
    }
  }

  async handleConnection(client: Socket) {
    const authenticated = await this.connectionAuth.authenticate(client);
    if (!authenticated) {
      this.reject(client, 401, 'WebSocket authentication required.');
      return;
    }

    const allowed = await this.connectionLimit.acquire(authenticated.userId);
    if (!allowed) {
      this.reject(client, 429, 'Too many connections. Try again later.');
      return;
    }

    client.data.userId = authenticated.userId;
    await client.join(callParticipantRoom(authenticated.userId));

    // Reconnect reconciliation: rejoin active call rooms and push the current
    // call state so the client can resume media instead of hanging.
    try {
      const active = await this.queryService.getUserActiveCall(authenticated.userId);
      if (active) {
        await client.join(callRoom(active.id));
        const participants = await this.queryService.getCallParticipants(active.id);
        client.emit(CALL_EVENT_STATE, {
          callId: active.id,
          status: active.status,
          type: active.type,
          scope: active.scope,
          scopeRef: active.scopeRef,
          participants,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Call-state resync failed for user ${authenticated.userId}.`,
        error,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.connectionLimit.release(userId);
    } catch (error) {
      this.logger.warn(`Failed to release connection slot for ${userId}.`, error);
    }

    // Zombie-call cleanup: the user dropped mid-call -> mark LEFT, tear down
    // the call when nobody is left, and surface missed-call notifications.
    try {
      const active = await this.queryService.getUserActiveCall(userId);
      if (!active) return;

      const room = callRoom(active.id);
      const wasRinging = active.status === 'RINGING';
      const isCallee = wasRinging && active.scope === CallScope.DM && userId !== active.creatorUserId;

      try {
        await this.commandService.leaveCall(userId, active.id);
      } catch (error) {
        this.logger.warn(`Disconnect leave failed for call ${active.id}.`, error);
      }

      this.server.to(room).emit(CALL_EVENT_PARTICIPANT_LEFT, {
        callId: active.id,
        userId,
      });

      await this.callEvents.publish('PARTICIPANT_LEFT', active, userId);

      const after = await this.queryService.getCall(active.id);
      if (after.status === 'ENDED') {
        if (isCallee) {
          await this.notificationPublisher.publishMissedCall({
            recipientUserId: active.creatorUserId,
            initiatorUserId: active.creatorUserId,
            callId: active.id,
            scope: active.scope,
            callType: active.type,
            scopeRef: active.scopeRef,
          });
          await this.callEvents.publish('MISSED', active, userId);
        }

        this.server.to(room).emit(CALL_EVENT_END, {
          callId: active.id,
          endedBy: userId,
          reason: 'participant-disconnected',
        });
        await this.callEvents.publish('ENDED', after, userId);
      }
    } catch (error) {
      this.logger.warn(`Unexpected error during disconnect cleanup for ${userId}.`, error);
    }
  }

  @SubscribeMessage('call:create')
  async createCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: CreateCallRequest,
  ) {
    const event = 'call:create';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-create', userId),
        limit: CALL_WS_RATE_LIMIT.CREATE,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      // Resolve + authorize the backing scope (conversation/channel) server-side.
      const context = await this.authorization.authorizeCreate(
        userId,
        input.scope,
        input.scopeRef,
        input.type,
      );

      // Abuse protection: frequency, unique recipients, rejection ratio, cooldown.
      await this.abuseProtection.checkCreateCallAllowed(
        userId,
        context.scope,
        context.scopeRef,
        context.ringTargetUserIds,
      );

      const result = await this.commandService.createCall(userId, {
        type: input.type,
        scope: context.scope,
        scopeRef: context.scopeRef,
        deviceId: input.deviceId,
      });

      const call = result.call;

      await this.callEvents.publish('CREATED', call, userId);
      await this.abuseProtection.recordCallCreated(userId, context.ringTargetUserIds);
      await this.metrics.increment('callsCreated');

      // Notify creator
      await client.join(callRoom(call.id));

      if (context.ringTargetUserIds.length > 0) {
        // DM scope: ring the peer.
        const participants = await this.queryService.getCallParticipants(call.id);
        const initiator = participants.find((p) => p.userId === userId)?.user ?? null;

        for (const targetUserId of context.ringTargetUserIds) {
          this.server.to(callParticipantRoom(targetUserId)).emit(CALL_EVENT_RING, {
            callId: call.id,
            type: call.type,
            scope: call.scope,
            scopeRef: call.scopeRef,
            initiatorUserId: userId,
            initiator,
          });

          await this.notificationPublisher.publishIncomingCall({
            recipientUserId: targetUserId,
            initiatorUserId: userId,
            callId: call.id,
            scope: call.scope,
            callType: call.type,
            scopeRef: call.scopeRef,
          });
        }
      } else if (context.scope === CallScope.SERVER_CHANNEL) {
        // Channel calls activate immediately; members join freely.
        await this.commandService.acceptCall(userId, call.id);
      }

      return { success: true, event, callId: call.id, status: result.status };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:join')
  async joinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: JoinCallRequest,
  ) {
    const event = 'call:join';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-join', userId),
        limit: CALL_WS_RATE_LIMIT.RING,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      const call = await this.queryService.getCall(input.callId);

      await this.authorization.authorizeJoin(userId, call);

      const participant = await this.commandService.joinCall(userId, input.callId, input.deviceId);

      await client.join(callRoom(input.callId));

      await this.callEvents.publish('PARTICIPANT_JOINED', call, userId);

      // Get current participants (with user info)
      const participants = await this.queryService.getCallParticipants(input.callId);
      const joined = participants.find((p) => p.userId === userId) ?? null;

      // Notify other participants
      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_PARTICIPANT_JOINED, {
        callId: input.callId,
        userId,
        deviceId: input.deviceId,
        user: joined?.user ?? null,
      });

      return {
        success: true,
        event,
        callId: input.callId,
        participants,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  /** Discover the active call for a scope (DM conversation / server channel). */
  @SubscribeMessage('call:get-active')
  async getActiveCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: GetActiveCallRequest,
  ) {
    const event = 'call:get-active';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-get-active', userId),
        limit: CALL_WS_RATE_LIMIT.RING,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.authorization.authorizeGetActive(
        userId,
        input.scope,
        input.scopeRef,
      );

      const call = await this.queryService.getActiveCallByScope(
        input.scope,
        input.scopeRef,
      );

      if (!call) {
        return { success: true, event, call: null, participants: [] };
      }

      const participants = await this.queryService.getCallParticipants(call.id);

      return { success: true, event, call, participants };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:leave')
  async leaveCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: LeaveCallRequest,
  ) {
    const event = 'call:leave';
    try {
      const userId = client.data.userId;
      await this.commandService.leaveCall(userId, input.callId);
      await client.leave(callRoom(input.callId));

      const afterLeave = await this.queryService.getCall(input.callId);
      await this.callEvents.publish('PARTICIPANT_LEFT', afterLeave, userId);
      if (afterLeave.status === 'ENDED') {
        await this.callEvents.publish('ENDED', afterLeave, userId);
      }

      // Notify other participants
      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_PARTICIPANT_LEFT, {
        callId: input.callId,
        userId,
      });

      return { success: true, event, callId: input.callId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:accept')
  async acceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: { callId: string },
  ) {
    const event = 'call:accept';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-accept', userId),
        limit: CALL_WS_RATE_LIMIT.ACCEPT,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.commandService.acceptCall(userId, input.callId);

      const acceptedCall = await this.queryService.getCall(input.callId);
      await this.callEvents.publish('ACCEPTED', acceptedCall, userId);
      await this.abuseProtection.recordCallAccepted(acceptedCall.creatorUserId);
      await this.metrics.increment('callsAccepted');

      // Notify all participants
      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_ACCEPT, {
        callId: input.callId,
        acceptedBy: userId,
      });

      return { success: true, event, callId: input.callId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:reject')
  async rejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: { callId: string },
  ) {
    const event = 'call:reject';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-reject', userId),
        limit: CALL_WS_RATE_LIMIT.REJECT,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      const updated = await this.commandService.rejectCall(userId, input.callId);

      await this.callEvents.publish('REJECTED', updated, userId);
      await this.abuseProtection.recordCallRejected(updated.creatorUserId);
      await this.metrics.increment('callsRejected');

      if (updated.scope === CallScope.DM) {
        await this.notificationPublisher.publishMissedCall({
          recipientUserId: updated.creatorUserId,
          initiatorUserId: updated.creatorUserId,
          callId: updated.id,
          scope: updated.scope,
          callType: updated.type,
          scopeRef: updated.scopeRef,
        });
        await this.callEvents.publish('MISSED', updated, userId);
        await this.systemMessages.publishCallRejected(
          updated.scopeRef,
          updated.creatorUserId,
          updated.id,
          updated.type,
        );
      }

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_REJECT, {
        callId: input.callId,
        rejectedBy: userId,
      });

      return { success: true, event, callId: input.callId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:cancel')
  async cancelCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: { callId: string },
  ) {
    const event = 'call:cancel';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-cancel', userId),
        limit: CALL_WS_RATE_LIMIT.CANCEL,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.commandService.cancelCall(userId, input.callId);

      const cancelledCall = await this.queryService.getCall(input.callId);
      await this.callEvents.publish('CANCELLED', cancelledCall, userId);
      await this.metrics.increment('callsCancelled');

      if (cancelledCall.scope === CallScope.DM) {
        await this.notificationPublisher.publishMissedCall({
          recipientUserId: cancelledCall.creatorUserId,
          initiatorUserId: cancelledCall.creatorUserId,
          callId: cancelledCall.id,
          scope: cancelledCall.scope,
          callType: cancelledCall.type,
          scopeRef: cancelledCall.scopeRef,
        });
        await this.callEvents.publish('MISSED', cancelledCall, userId);
        await this.systemMessages.publishMissedCall(
          cancelledCall.scopeRef,
          cancelledCall.creatorUserId,
          cancelledCall.id,
          cancelledCall.type,
        );
      }

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_CANCEL, {
        callId: input.callId,
        cancelledBy: userId,
      });

      return { success: true, event, callId: input.callId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:end')
  async endCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: { callId: string },
  ) {
    const event = 'call:end';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-end', userId),
        limit: CALL_WS_RATE_LIMIT.END,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      const before = await this.queryService.getCall(input.callId);

      await this.commandService.endCall(userId, input.callId);

      const endedCall = await this.queryService.getCall(input.callId);
      await this.callEvents.publish('ENDED', endedCall, userId);
      await this.metrics.increment('callsEnded');
      
      if (before.startedAt && endedCall.endedAt) {
        const durationMs = new Date(endedCall.endedAt).getTime() - new Date(before.startedAt).getTime();
        await this.metrics.recordCallDuration(durationMs);
      }

      if (before.status === 'RINGING') {
        await this.notificationPublisher.publishMissedCall({
          recipientUserId: before.creatorUserId,
          initiatorUserId: before.creatorUserId,
          callId: before.id,
          scope: before.scope as CallScope,
          callType: before.type,
          scopeRef: before.scopeRef,
        });
        await this.callEvents.publish('MISSED', endedCall, userId);
        await this.systemMessages.publishMissedCall(
          before.scopeRef,
          before.creatorUserId,
          before.id,
          before.type,
        );
      } else if (before.scope === CallScope.DM && before.startedAt && endedCall.endedAt) {
        const durationSeconds = Math.floor(
          (new Date(endedCall.endedAt).getTime() - new Date(before.startedAt).getTime()) / 1000,
        );
        await this.systemMessages.publishCallEnded(
          before.scopeRef,
          before.creatorUserId,
          before.id,
          before.type,
          durationSeconds,
        );
      }

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_END, {
        callId: input.callId,
        endedBy: userId,
      });

      return { success: true, event, callId: input.callId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('webrtc:offer')
  async webrtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: SignalRequest,
  ) {
    const event = 'webrtc:offer';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('webrtc-offer', userId),
        limit: CALL_WS_RATE_LIMIT.SIGNAL,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      // Forward to target user
      await this.commandService.assertCanSignal(userId, input.callId, input.targetUserId);

      this.server.to(callParticipantRoom(input.targetUserId)).emit(CALL_EVENT_WEBRTC_OFFER, {
        callId: input.callId,
        fromUserId: userId,
        payload: input.payload,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('webrtc:answer')
  async webrtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: SignalRequest,
  ) {
    const event = 'webrtc:answer';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('webrtc-answer', userId),
        limit: CALL_WS_RATE_LIMIT.SIGNAL,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.commandService.assertCanSignal(userId, input.callId, input.targetUserId);

      this.server.to(callParticipantRoom(input.targetUserId)).emit(CALL_EVENT_WEBRTC_ANSWER, {
        callId: input.callId,
        fromUserId: userId,
        payload: input.payload,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('webrtc:ice-candidate')
  async iceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: IceCandidateRequest,
  ) {
    const event = 'webrtc:ice-candidate';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('ice-candidate', userId),
        limit: CALL_WS_RATE_LIMIT.SIGNAL,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.commandService.assertCanSignal(userId, input.callId, input.targetUserId);

      this.server.to(callParticipantRoom(input.targetUserId)).emit(CALL_EVENT_WEBRTC_ICE_CANDIDATE, {
        callId: input.callId,
        fromUserId: userId,
        candidate: input.candidate,
        sdpMid: input.sdpMid,
        sdpMLineIndex: input.sdpMLineIndex,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:mute')
  async mute(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: MuteRequest,
  ) {
    const event = 'call:mute';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-mute', userId),
        limit: CALL_WS_RATE_LIMIT.MUTE,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      // In real implementation, would check permissions
      // For now, allow self-mute only
      const targetUserId = userId;

      await this.commandService.muteParticipant(userId, input.callId, targetUserId);

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_MUTE, {
        callId: input.callId,
        userId: targetUserId,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:unmute')
  async unmute(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: UnmuteRequest,
  ) {
    const event = 'call:unmute';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-unmute', userId),
        limit: CALL_WS_RATE_LIMIT.MUTE,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      const targetUserId = userId;

      await this.commandService.unmuteParticipant(userId, input.callId, targetUserId);

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_UNMUTE, {
        callId: input.callId,
        userId: targetUserId,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:camera-on')
  async cameraOn(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: CameraOnRequest,
  ) {
    const event = 'call:camera-on';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-camera-on', userId),
        limit: CALL_WS_RATE_LIMIT.CAMERA,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.commandService.setCamera(userId, input.callId, userId, true);

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_CAMERA_ON, {
        callId: input.callId,
        userId,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:camera-off')
  async cameraOff(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: CameraOffRequest,
  ) {
    const event = 'call:camera-off';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-camera-off', userId),
        limit: CALL_WS_RATE_LIMIT.CAMERA,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      await this.commandService.setCamera(userId, input.callId, userId, false);

      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_CAMERA_OFF, {
        callId: input.callId,
        userId,
      });

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('call:stun-turn-config')
  async stunTurnConfig(@ConnectedSocket() client: Socket) {
    const event = 'call:stun-turn-config';
    try {
      const iceServers = await this.iceServerProvider.getIceServers();
      return {
        success: true,
        event,
        iceServers,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  private reject(client: Socket, statusCode: number, message: string) {
    client.emit('error', { statusCode, message });
    client.disconnect(true);
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }
}