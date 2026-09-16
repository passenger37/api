import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Call } from '@prisma/client';
import { ServerPermission } from '@prisma/client';

import { DirectMessageChannelRepository } from '../../direct-messages/repositories/direct-message-channel.repository';
import { UserSocialRepository } from '../../users/repositories/user-social.repository';
import { ServerChannelQueryService } from '../../servers/services/server-channel-query.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { CallParticipantRepository } from '../repositories/call.repository';
import {
  CallParticipantState,
  CallScope,
  CallType,
} from '../types/calling.types';

export interface CallCreateContext {
  scope: CallScope;
  scopeRef: string;
  callType?: CallType;
  /** User ids that should be rung for this call (DM peers, channel members that are on the WS room). */
  ringTargetUserIds: string[];
}

@Injectable()
export class CallAuthorizationService {
  constructor(
    private readonly dmChannelRepository: DirectMessageChannelRepository,
    private readonly userSocialRepository: UserSocialRepository,
    private readonly channelQueryService: ServerChannelQueryService,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly permissionService: ServerPermissionService,
    private readonly participantRepository: CallParticipantRepository,
  ) {}

  /**
   * Authorize `call:create`. Never trust `scopeRef` from the client without
   * resolving the backing object (conversation / channel) server-side.
   */
  async authorizeCreate(
    userId: string,
    scope: CallScope,
    scopeRef: string,
    callType: CallType,
  ): Promise<CallCreateContext> {
    switch (scope) {
      case CallScope.DM:
        return this.authorizeDmCreate(userId, scopeRef, callType);
      case CallScope.SERVER_CHANNEL:
        return this.authorizeChannelCreate(userId, scopeRef, callType);
      default:
        throw new ForbiddenException(
          'CALL_NOT_ALLOWED: this call scope is not supported yet.',
        );
    }
  }

  /**
   * Authorize discovering whether an active call exists for a scope. A DM
   * member or a server member with join permission may query the scope; the
   * caller still needs `authorizeCreate`/`authorizeJoin` to act on the result.
   */
  async authorizeGetActive(
    userId: string,
    scope: CallScope,
    scopeRef: string,
  ): Promise<void> {
    switch (scope) {
      case CallScope.DM:
        await this.requireDmMember(scopeRef, userId);
        return;
      case CallScope.SERVER_CHANNEL:
        await this.requireChannelPermission(
          scopeRef,
          userId,
          ServerPermission.CHANNEL_CALL_JOIN,
        );
        return;
      default:
        throw new ForbiddenException(
          'CALL_NOT_ALLOWED: this call scope is not supported yet.',
        );
    }
  }

  /** Authorize `call:join` — membership/permission bound to the call scope. */
  async authorizeJoin(userId: string, call: Call): Promise<void> {
    switch (call.scope) {
      case CallScope.DM: {
        await this.requireDmMember(call.scopeRef, userId);
        // Re-check block rules on join as well as create — a call created
        // before a block still must not let the (now blocked) user in.
        const peers = await this.dmChannelRepository.findById(call.scopeRef);
        const targetUserId = peers
          ? peers.userAId === userId
            ? peers.userBId
            : peers.userAId
          : null;
        if (targetUserId && (await this.isBlockedEitherWay(userId, targetUserId))) {
          throw new ForbiddenException(
            'CALL_NOT_ALLOWED: a blocked user cannot join this call.',
          );
        }
        return;
      }
      case CallScope.SERVER_CHANNEL: {
        await this.requireChannelPermission(
          call.scopeRef,
          userId,
          ServerPermission.CHANNEL_CALL_JOIN,
        );
        // Channel must still be a calling channel (may have been re-typed).
        await this.requireCallCompatibleChannel(call.scopeRef, call.type as CallType);
        return;
      }
      default:
        throw new ForbiddenException(
          'CALL_NOT_ALLOWED: this call scope is not supported yet.',
        );
    }
  }

  /**
   * Callee authorization for accept/reject: the ringing peer can accept/reject
   * a DM call (the creator could re-accept their own call on another device).
   */
  async assertCanAccept(userId: string, call: Call): Promise<void> {
    if (call.creatorUserId === userId) {
      return;
    }
    if (
      call.scope === CallScope.DM &&
      (await this.isDmCallee(userId, call)) &&
      call.status === 'RINGING'
    ) {
      return;
    }
    if (await this.isActiveParticipant(call.id, userId)) {
      return;
    }
    throw new ForbiddenException('NOT_CALL_PARTICIPANT: cannot accept this call.');
  }

  async assertCanReject(userId: string, call: Call): Promise<void> {
    if (call.creatorUserId === userId) {
      return;
    }
    if (
      call.scope === CallScope.DM &&
      (await this.isDmCallee(userId, call)) &&
      call.status === 'RINGING'
    ) {
      return;
    }
    throw new ForbiddenException('NOT_CALL_PARTICIPANT: cannot reject this call.');
  }

  async assertCanCancel(userId: string, call: Call): Promise<void> {
    if (call.creatorUserId !== userId) {
      throw new ForbiddenException('Only the call creator can cancel this call.');
    }
  }

  async assertCanEnd(userId: string, call: Call): Promise<void> {
    if (call.creatorUserId === userId) {
      return;
    }
    if (await this.isActiveParticipant(call.id, userId)) {
      return;
    }
    throw new ForbiddenException('NOT_CALL_PARTICIPANT: cannot end this call.');
  }

  /**
   * Mute/camera may target self at minimum; targeting another participant
   * requires CHANNEL_CALL_MANAGE (server channels) and is otherwise denied.
   */
  async assertCanControlParticipant(
    userId: string,
    call: Call,
    targetUserId: string,
  ): Promise<void> {
    if (userId === targetUserId) {
      return;
    }
    if (call.scope === CallScope.SERVER_CHANNEL) {
      await this.requireChannelPermission(
        call.scopeRef,
        userId,
        ServerPermission.CHANNEL_CALL_MANAGE,
      );
      return;
    }
    throw new ForbiddenException(
      'CALL_PERMISSION_DENIED: can only control your own media state here.',
    );
  }

  /** Signaling between two active participants of the same call only. */
  async assertCanSignal(
    userId: string,
    callId: string,
    targetUserId: string,
    call: Call | null,
  ): Promise<void> {
    if (!call) {
      throw new NotFoundException('CALL_NOT_FOUND.');
    }
    if (
      !(await this.isActiveParticipant(callId, userId)) ||
      !(await this.isActiveParticipant(callId, targetUserId))
    ) {
      throw new ForbiddenException(
        'NOT_CALL_PARTICIPANT: signaling allowed between participants only.',
      );
    }
  }

  /** The ringing peer of a DM call (the non-creator conversation member). */
  async isDmCallee(userId: string, call: Call): Promise<boolean> {
    if (call.scope !== CallScope.DM) {
      return false;
    }
    const channel = await this.dmChannelRepository.findById(call.scopeRef);
    if (!channel) {
      return false;
    }
    return (
      userId !== call.creatorUserId &&
      (channel.userAId === userId || channel.userBId === userId)
    );
  }

  async isActiveParticipant(callId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findByCallAndUser(
      callId,
      userId,
    );
    return (
      !!participant &&
      participant.state !== CallParticipantState.LEFT &&
      participant.leftAt === null
    );
  }

  private async authorizeDmCreate(
    userId: string,
    conversationId: string,
    callType: CallType,
  ): Promise<CallCreateContext> {
    const targetUserIds = await this.requireDmCreate(userId, conversationId);

    return {
      scope: CallScope.DM,
      scopeRef: conversationId,
      callType,
      ringTargetUserIds: targetUserIds,
    };
  }

  /**
   * Validate conversation existence, caller membership, and block rules both
   * directions. Returns the peers that should be rung.
   */
  private async requireDmCreate(
    userId: string,
    conversationId: string,
  ): Promise<string[]> {
    const channel = await this.dmChannelRepository.findById(conversationId);

    if (!channel) {
      throw new NotFoundException('CONVERSATION_NOT_FOUND.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new ForbiddenException(
        'CONVERSATION_ACCESS_DENIED: you are not a participant of this conversation.',
      );
    }

    const targetUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    if (await this.isBlockedEitherWay(userId, targetUserId)) {
      throw new ForbiddenException(
        'CALL_NOT_ALLOWED: a blocked user cannot be called.',
      );
    }

    return [targetUserId];
  }

  /** Block exists in either direction between the two users. */
  private async isBlockedEitherWay(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const callerBlockedTarget = await this.userSocialRepository.existsBlock(
      userId,
      targetUserId,
    );
    const targetBlockedCaller = await this.userSocialRepository.existsBlock(
      targetUserId,
      userId,
    );
    return callerBlockedTarget || targetBlockedCaller;
  }

  private async authorizeChannelCreate(
    userId: string,
    channelId: string,
    callType: CallType,
  ): Promise<CallCreateContext> {
    await this.requireChannelPermission(
      channelId,
      userId,
      ServerPermission.CHANNEL_CALL_START,
    );

    // Only voice/video channels may host a call, and the call type must match
    // the channel type. Docs: server-audio-channels.md, server-video-channels.md
    await this.requireCallCompatibleChannel(channelId, callType);

    return {
      scope: CallScope.SERVER_CHANNEL,
      scopeRef: channelId,
      callType,
      ringTargetUserIds: [],
    };
  }

  /**
   * CHANNEL compatibility: a call can only run in a VOICE or VIDEO channel,
   * and the call type must match the channel type (camera is a video-only
   * control, rejected separately by the command service).
   */
  private async requireCallCompatibleChannel(
    channelId: string,
    callType: CallType,
  ): Promise<void> {
    const channel = await this.channelQueryService.getChannelOrThrow(channelId);

    if (channel.type !== 'VOICE' && channel.type !== 'VIDEO') {
      throw new ForbiddenException(
        'CALL_NOT_ALLOWED: calls can only be started in voice or video channels.',
      );
    }
    if (callType === CallType.VIDEO && channel.type !== 'VIDEO') {
      throw new ForbiddenException(
        'CALL_NOT_ALLOWED: video calls require a video channel.',
      );
    }
    if (callType === CallType.VOICE && channel.type !== 'VOICE') {
      throw new ForbiddenException(
        'CALL_NOT_ALLOWED: voice calls cannot be started in a video channel.',
      );
    }
  }

  private async requireDmMember(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const channel = await this.dmChannelRepository.findById(conversationId);

    if (!channel || (channel.userAId !== userId && channel.userBId !== userId)) {
      throw new ForbiddenException(
        'CONVERSATION_ACCESS_DENIED: you are not a participant of this conversation.',
      );
    }
  }

  private async requireChannelPermission(
    channelId: string,
    userId: string,
    permission: ServerPermission,
  ): Promise<void> {
    const channel = await this.channelQueryService.getChannelOrThrow(channelId);

    await this.memberQueryService.getMemberOrThrow(channel.serverId, userId);

    await this.permissionService.requirePermission(
      channel.serverId,
      userId,
      permission,
      channel.id,
    );
  }

  /**
   * Validate that a user still has permission to participate in a call.
   * Used for runtime permission revocation checks.
   */
  async validateOngoingCallParticipation(call: Call, userId: string): Promise<void> {
    switch (call.scope) {
      case CallScope.DM: {
        const channel = await this.dmChannelRepository.findById(call.scopeRef);
        if (!channel || (channel.userAId !== userId && channel.userBId !== userId)) {
          throw new ForbiddenException('CONVERSATION_ACCESS_DENIED: no longer a participant.');
        }
        const targetUserId = channel.userAId === userId ? channel.userBId : channel.userAId;
        if (await this.isBlockedEitherWay(userId, targetUserId)) {
          throw new ForbiddenException('CALL_NOT_ALLOWED: blocked.');
        }
        return;
      }
      case CallScope.SERVER_CHANNEL: {
        await this.requireChannelPermission(
          call.scopeRef,
          userId,
          ServerPermission.CHANNEL_CALL_JOIN,
        );
        await this.requireCallCompatibleChannel(call.scopeRef, call.type as CallType);
        return;
      }
      default:
        throw new ForbiddenException('CALL_NOT_ALLOWED: unsupported scope.');
    }
  }
}