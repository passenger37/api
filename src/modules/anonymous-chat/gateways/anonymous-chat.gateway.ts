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
import {
  Logger,
  OnModuleDestroy,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { WebSocketExceptionFilter } from '../../../common/filters/websocket-exception.filter';
import { WebSocketJwtGuard } from '../../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketValidationPipe } from '../../../common/websocket/pipes/websocket-validation.pipe';
import { WebSocketErrorNormalizer } from '../../../common/websocket/error/websocket-error.normalizer';
import {
  WEB_SOCKET_ALLOWED_ORIGINS,
  WS_MAX_BUFFER_BYTES,
} from '../../../common/websocket/websocket-origins';

import {
  ANONYMOUS_CLEANUP_INTERVAL_SECONDS,
  ANONYMOUS_EVENT_BLOCK,
  ANONYMOUS_EVENT_END,
  ANONYMOUS_EVENT_ENDED,
  ANONYMOUS_EVENT_HEARTBEAT,
  ANONYMOUS_EVENT_JOIN_QUEUE,
  ANONYMOUS_EVENT_LEAVE_QUEUE,
  ANONYMOUS_EVENT_MATCHED,
  ANONYMOUS_EVENT_MESSAGE,
  ANONYMOUS_EVENT_PEER_DISCONNECTED,
  ANONYMOUS_EVENT_PEER_RECONNECTED,
  ANONYMOUS_EVENT_QUEUED,
  ANONYMOUS_EVENT_REPORT,
  ANONYMOUS_EVENT_SKIP,
  ANONYMOUS_EVENT_TYPING,
  anonymousUserRoom,
} from '../constants/anonymous-chat.constants';
import {
  AnonymousHeartbeatRequest,
  AnonymousSessionActionRequest,
  AnonymousTypingRequest,
  JoinAnonymousQueueRequest,
  LeaveAnonymousQueueRequest,
  ReportAnonymousUserRequest,
  SendAnonymousMessageRequest,
} from '../dto/request';
import { AnonymousChatCleanupService } from '../services/anonymous-chat.cleanup.service';
import {
  AnonymousChatCommandService,
  AnonymousJoinQueueResult,
} from '../services/anonymous-chat.command.service';
import { AnonymousChatPresenceService } from '../services/anonymous-chat.presence.service';
import { AnonymousChatQueryService } from '../services/anonymous-chat.query.service';
import { AnonymousChatSessionService } from '../services/anonymous-chat.session.service';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import { AnonymousPublicProfile } from '../types/anonymous-chat.types';

@WebSocketGateway({
  namespace: '/anonymous',
  cors: { origin: WEB_SOCKET_ALLOWED_ORIGINS },
  maxHttpBufferSize: WS_MAX_BUFFER_BYTES,
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class AnonymousChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(AnonymousChatGateway.name);

  private cleanupTimer?: NodeJS.Timeout;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly connectionAuth: WebSocketConnectionAuthService,
    private readonly connectionLimit: WebSocketConnectionLimitService,
    private readonly commandService: AnonymousChatCommandService,
    private readonly queryService: AnonymousChatQueryService,
    private readonly cleanupService: AnonymousChatCleanupService,
    private readonly presence: AnonymousChatPresenceService,
    private readonly sessionService: AnonymousChatSessionService,
    private readonly mapper: AnonymousMapper,
  ) {}

  afterInit() {
    this.cleanupTimer = setInterval(() => {
      void this.sweep().catch((error) => {
        this.logger.error('Anonymous chat cleanup sweep failed.', error);
      });
    }, ANONYMOUS_CLEANUP_INTERVAL_SECONDS * 1000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private async sweep(): Promise<void> {
    const { expiredSessions, closedRooms } = await this.cleanupService.sweep();

    for (const session of expiredSessions) {
      this.server
        .to(anonymousUserRoom(session.userId))
        .emit(ANONYMOUS_EVENT_ENDED, {
          sessionId: session.sessionId,
          roomId: null,
          reason: 'EXPIRED',
        });
    }

    for (const room of closedRooms) {
      for (const participantUserId of room.participantUserIds) {
        this.server
          .to(anonymousUserRoom(participantUserId))
          .emit(ANONYMOUS_EVENT_ENDED, {
            roomId: room.roomId,
            reason: room.reason,
          });
      }
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

    (client.data as { userId?: string }).userId = authenticated.userId;
    await client.join(anonymousUserRoom(authenticated.userId));

    // Reconnect reconciliation: resume presence, tell the peer we are back and
    // push the current session state so the client can rebuild its UI.
    try {
      const reconnected = await this.presence.onReconnect(authenticated.userId);
      if (reconnected) {
        this.server
          .to(anonymousUserRoom(reconnected.peerUserId))
          .emit(ANONYMOUS_EVENT_PEER_RECONNECTED, {
            roomId: reconnected.roomId,
          });
      }

      const state = await this.queryService.getCurrentState(
        authenticated.userId,
      );
      if (state.kind === 'active') {
        client.emit(ANONYMOUS_EVENT_MATCHED, {
          sessionId: state.sessionId,
          roomId: state.roomId,
          topic: state.topic,
          self: this.mapper.toPublicProfile(state.self),
          peer: this.mapper.toPublicProfile(state.peer),
          matchedAt: state.matchedAt,
        });
      } else if (state.kind === 'queued') {
        client.emit(ANONYMOUS_EVENT_QUEUED, {
          sessionId: state.sessionId,
          topic: state.topic,
          displayId: state.displayId,
          queuedAt: state.queuedAt,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Anonymous reconnect reconciliation failed for ${authenticated.userId}.`,
        error,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.clientUserId(client);
    if (!userId) return;

    try {
      await this.connectionLimit.release(userId);
    } catch (error) {
      this.logger.warn(
        `Failed to release connection slot for ${userId}.`,
        error,
      );
    }

    try {
      const disconnected = await this.presence.onDisconnect(userId);
      if (disconnected) {
        this.server
          .to(anonymousUserRoom(disconnected.peerUserId))
          .emit(ANONYMOUS_EVENT_PEER_DISCONNECTED, {
            roomId: disconnected.roomId,
          });
      } else {
        // No active room: leave the matchmaking queue on disconnect.
        const engaged = await this.sessionService.findEngagedSession(userId);
        if (engaged && engaged.status === 'WAITING') {
          await this.sessionService.closeQueueSession(engaged.id);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Unexpected anonymous disconnect cleanup for ${userId}.`,
        error,
      );
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_JOIN_QUEUE)
  async joinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: JoinAnonymousQueueRequest,
  ) {
    const event = ANONYMOUS_EVENT_JOIN_QUEUE;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.joinQueue(
        userId,
        input.topic ?? 'general',
      );

      this.deliverJoinResult(client, userId, result);

      return {
        success: true,
        event,
        status: result.matched ? 'MATCHED' : 'WAITING',
        sessionId: result.sessionId,
        topic: result.topic,
        displayId: result.identity.displayId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_LEAVE_QUEUE)
  async leaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: LeaveAnonymousQueueRequest,
  ) {
    const event = ANONYMOUS_EVENT_LEAVE_QUEUE;
    try {
      const userId = this.clientUserId(client);
      await this.commandService.leaveQueue(userId, input.sessionId);
      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_MESSAGE)
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: SendAnonymousMessageRequest,
  ) {
    const event = ANONYMOUS_EVENT_MESSAGE;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.sendMessage(
        userId,
        input.sessionId,
        input.messageId,
        input.content,
      );

      if (result.peer) {
        this.server
          .to(anonymousUserRoom(result.peer.peerUserId))
          .emit(ANONYMOUS_EVENT_MESSAGE, {
            messageId: result.peer.messageId,
            anonymousDisplayId: result.senderDisplayId,
            content: result.peer.content,
            createdAt: result.peer.createdAt,
          });
      }

      return {
        success: true,
        event,
        status: result.status,
        clientMessageId: result.ack?.clientMessageId ?? input.messageId,
        messageId: result.ack?.messageId ?? null,
        createdAt: result.ack?.createdAt ?? null,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_TYPING)
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: AnonymousTypingRequest,
  ) {
    const event = ANONYMOUS_EVENT_TYPING;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.typing(
        userId,
        input.sessionId,
        input.isTyping,
      );

      if (result.peerUserId) {
        this.server
          .to(anonymousUserRoom(result.peerUserId))
          .emit(ANONYMOUS_EVENT_TYPING, {
            sessionId: result.sessionId,
            isTyping: result.isTyping,
          });
      }

      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_SKIP)
  async skip(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: AnonymousSessionActionRequest,
  ) {
    const event = ANONYMOUS_EVENT_SKIP;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.skip(userId, input.sessionId);

      this.notifyEnded(result.roomId, result.peerUserId, userId, 'NEXT');

      if (result.requeued && result.next) {
        this.deliverJoinResult(client, userId, result.next);
      }

      return {
        success: true,
        event,
        requeued: result.requeued ?? false,
        sessionId: result.next?.sessionId ?? null,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_END)
  async end(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: AnonymousSessionActionRequest,
  ) {
    const event = ANONYMOUS_EVENT_END;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.endChat(userId, input.sessionId);

      this.notifyEnded(result.roomId, result.peerUserId, userId, 'NEXT');

      return { success: true, event, roomId: result.roomId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_REPORT)
  async report(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: ReportAnonymousUserRequest,
  ) {
    const event = ANONYMOUS_EVENT_REPORT;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.report(
        userId,
        input.sessionId,
        input.reason,
        input.detail,
      );

      if (result.terminated) {
        // Terminating report — tell both sides the session is over.
        client.emit(ANONYMOUS_EVENT_ENDED, {
          reason: 'REPORT',
          reportId: result.reportId,
        });
        if (result.peerUserId) {
          this.server
            .to(anonymousUserRoom(result.peerUserId))
            .emit(ANONYMOUS_EVENT_ENDED, { reason: 'REPORT' });
        }
      }

      return {
        success: true,
        event,
        reportId: result.reportId,
        terminated: result.terminated,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_BLOCK)
  async block(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: AnonymousSessionActionRequest,
  ) {
    const event = ANONYMOUS_EVENT_BLOCK;
    try {
      const userId = this.clientUserId(client);
      const result = await this.commandService.block(userId, input.sessionId);

      client.emit(ANONYMOUS_EVENT_ENDED, {
        roomId: result.roomId,
        reason: 'BLOCK',
      });
      if (result.peerUserId) {
        this.server
          .to(anonymousUserRoom(result.peerUserId))
          .emit(ANONYMOUS_EVENT_ENDED, {
            roomId: result.roomId,
            reason: 'BLOCK',
          });
      }

      return { success: true, event, roomId: result.roomId };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage(ANONYMOUS_EVENT_HEARTBEAT)
  async heartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: AnonymousHeartbeatRequest,
  ) {
    const event = ANONYMOUS_EVENT_HEARTBEAT;
    try {
      const userId = this.clientUserId(client);
      await this.commandService.heartbeat(userId, input?.sessionId);
      return { success: true, event };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  // =====================================================
  // Private helpers
  // =====================================================

  /**
   * Emits `anonymous:matched` to both participants (or `anonymous:queued` to
   * the caller) and returns the client-safe payload for the caller.
   */
  private deliverJoinResult(
    client: Socket,
    userId: string,
    result: AnonymousJoinQueueResult,
  ): void {
    if (result.matched && result.outcome) {
      const outcome = result.outcome;

      client.emit(ANONYMOUS_EVENT_MATCHED, result.matched);

      const peerUserId =
        outcome.aUserId === userId ? outcome.bUserId : outcome.aUserId;
      const peerSessionId =
        outcome.aUserId === userId ? outcome.bSessionId : outcome.aSessionId;
      const peerSelf = outcome.aUserId === userId ? outcome.b : outcome.a;
      const peerPeer = outcome.aUserId === userId ? outcome.a : outcome.b;

      const peerPayload: {
        sessionId: string;
        roomId: string;
        topic: string;
        self: AnonymousPublicProfile;
        peer: AnonymousPublicProfile;
        matchedAt: string;
      } = {
        sessionId: peerSessionId,
        roomId: outcome.roomId,
        topic: outcome.topic,
        self: this.mapper.toPublicProfile(peerSelf),
        peer: this.mapper.toPublicProfile(peerPeer),
        matchedAt: outcome.matchedAt,
      };

      this.server
        .to(anonymousUserRoom(peerUserId))
        .emit(ANONYMOUS_EVENT_MATCHED, peerPayload);
      return;
    }

    client.emit(ANONYMOUS_EVENT_QUEUED, {
      sessionId: result.sessionId,
      topic: result.topic,
      displayId: result.identity.displayId,
      queuedAt: new Date().toISOString(),
    });
  }

  private notifyEnded(
    roomId: string,
    peerUserId: string | undefined,
    endedByUserId: string,
    reason: string,
  ): void {
    if (!peerUserId) return;
    this.server.to(anonymousUserRoom(peerUserId)).emit(ANONYMOUS_EVENT_ENDED, {
      roomId,
      reason,
      endedBy: endedByUserId,
    });
  }

  private reject(client: Socket, statusCode: number, message: string) {
    client.emit('error', { statusCode, message });
    client.disconnect(true);
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }

  /** Typed accessor for the authenticated user id stashed on the socket. */
  private clientUserId(client: Socket): string {
    return (client.data as { userId?: string }).userId ?? '';
  }
}
