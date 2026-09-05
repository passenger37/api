import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
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
  CALL_EVENT_REJECT,
  CALL_EVENT_RING,
  CALL_EVENT_UNMUTE,
  CALL_EVENT_WEBRTC_ANSWER,
  CALL_EVENT_WEBRTC_OFFER,
  CALL_ROOM,
  CALL_WS_RATE_LIMIT,
  CALL_WINDOW_SECONDS,
  callRoom,
  callParticipantRoom,
} from '../constants/calling.constants';

import { CallCommandService } from '../services/call-command.service';
import { CallQueryService } from '../services/call-query.service';
import {
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
export class CallingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly rateLimit: WebSocketRateLimitService,
    private readonly commandService: CallCommandService,
    private readonly queryService: CallQueryService,
    private readonly connectionAuth: WebSocketConnectionAuthService,
    private readonly connectionLimit: WebSocketConnectionLimitService,
  ) {}

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
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      await this.connectionLimit.release(userId);
    }
  }

  @SubscribeMessage('call:create')
  async createCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: { type: string; scope: string; scopeRef: string; deviceId?: string },
  ) {
    const event = 'call:create';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('call-create', userId),
        limit: CALL_WS_RATE_LIMIT.CREATE,
        windowSeconds: CALL_WINDOW_SECONDS,
      });

      const result = await this.commandService.createCall(userId, {
        type: input.type as any,
        scope: input.scope as any,
        scopeRef: input.scopeRef,
        deviceId: input.deviceId,
      });

      // Notify creator
      client.join(callRoom(result.call.id));

      // Ring other participants (would query scope participants)
      // For DM scope, ring the other user
      // For SERVER_CHANNEL, ring channel members with permission

      return { success: true, event, callId: result.call.id, status: result.status };
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

      const participant = await this.commandService.joinCall(userId, input.callId, input.deviceId);

      await client.join(callRoom(input.callId));

      // Notify other participants
      this.server.to(callRoom(input.callId)).emit(CALL_EVENT_PARTICIPANT_JOINED, {
        callId: input.callId,
        userId,
        deviceId: input.deviceId,
      });

      // Get current participants
      const participants = await this.queryService.getCallParticipants(input.callId);

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

      await this.commandService.rejectCall(userId, input.callId);

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

      await this.commandService.endCall(userId, input.callId);

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
      return {
        success: true,
        event,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // TURN servers would be configured here with credentials
        ],
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