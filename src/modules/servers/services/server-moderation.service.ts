import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerBanRepository } from '../repositories/server-ban.repository';
import { ModerationAuditRepository } from '../repositories/moderation-audit.repository';
import { ServerMemberQueryService } from './server-member-query.service';
import { ServerHierarchyService } from './server-hierarchy.service';
import { ServerPermissionService } from './server-permission.service';

@Injectable()
export class ServerModerationService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly memberQueryService: ServerMemberQueryService,

    private readonly memberRepository: ServerMemberRepository,

    private readonly banRepository: ServerBanRepository,

    private readonly auditRepository: ModerationAuditRepository,

    private readonly hierarchyService: ServerHierarchyService,

    private readonly permissionService: ServerPermissionService,
  ) {}

  async kickMember(
    serverId: string,
    actorUserId: string,
    targetMemberId: string,
    reason?: string,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      actorUserId,
      ServerPermission.MEMBER_KICK,
    );

    const [actor, target] = await Promise.all([
      this.memberQueryService.getMemberOrThrow(serverId, actorUserId),
      this.memberRepository.findById(targetMemberId),
    ]);

    if (!target || target.serverId !== serverId) {
      throw new NotFoundException('Server member not found.');
    }

    this.assertTargetManageable(actorUserId, target.userId);

    if (target.removedAt) {
      throw new BadRequestException('Member is not in this server anymore.');
    }

    await this.assertHierarchy(serverId, actorUserId, target.userId);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const removedAt = new Date();

      await this.memberRepository.markRemoved(target.id, removedAt, tx);

      await this.auditRepository.create(
        {
          serverId,
          actorMemberId: actor.id,
          action: 'MEMBER_KICKED',
          targetUserId: target.userId,
          targetMemberId: target.id,
          reason: reason ?? null,
        },
        tx,
      );
    });

    this.permissionService.clearUserCache(serverId, target.userId);

    return {
      success: true,
      memberId: target.id,
      kickedAt: new Date().toISOString(),
    };
  }

  async banMember(
    serverId: string,
    actorUserId: string,
    targetMemberId: string,
    reason?: string,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      actorUserId,
      ServerPermission.MEMBER_BAN,
    );

    const [actor, target] = await Promise.all([
      this.memberQueryService.getMemberOrThrow(serverId, actorUserId),
      this.memberRepository.findById(targetMemberId),
    ]);

    if (!target || target.serverId !== serverId) {
      throw new NotFoundException('Server member not found.');
    }

    this.assertTargetManageable(actorUserId, target.userId);

    const existingBan = await this.banRepository.findByServerAndUser(
      serverId,
      target.userId,
    );

    if (existingBan) {
      throw new BadRequestException('Member is already banned.');
    }

    await this.assertHierarchy(serverId, actorUserId, target.userId);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const now = new Date();

      await this.banRepository.create(
        {
          serverId,
          userId: target.userId,
          bannedById: actorUserId,
          reason: reason ?? null,
        },
        tx,
      );

      if (!target.removedAt) {
        await this.memberRepository.markRemoved(target.id, now, tx);
      }

      await this.auditRepository.create(
        {
          serverId,
          actorMemberId: actor.id,
          action: 'MEMBER_BANNED',
          targetUserId: target.userId,
          targetMemberId: target.id,
          reason: reason ?? null,
        },
        tx,
      );
    });

    this.permissionService.clearUserCache(serverId, target.userId);

    return {
      success: true,
      memberId: target.id,
      bannedAt: new Date().toISOString(),
    };
  }

  async unbanMember(
    serverId: string,
    actorUserId: string,
    targetMemberId: string,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      actorUserId,
      ServerPermission.MEMBER_BAN,
    );

    const [actor, target] = await Promise.all([
      this.memberQueryService.getMemberOrThrow(serverId, actorUserId),
      this.memberRepository.findById(targetMemberId),
    ]);

    if (!target || target.serverId !== serverId) {
      throw new NotFoundException('Server member not found.');
    }

    const ban = await this.banRepository.findByServerAndUser(
      serverId,
      target.userId,
    );

    if (!ban) {
      throw new NotFoundException('No active ban for this member.');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.banRepository.deleteByServerAndUser(
        serverId,
        target.userId,
        tx,
      );

      await this.auditRepository.create(
        {
          serverId,
          actorMemberId: actor.id,
          action: 'MEMBER_UNBANNED',
          targetUserId: target.userId,
          targetMemberId: target.id,
        },
        tx,
      );
    });

    return {
      success: true,
      memberId: target.id,
      unbannedAt: new Date().toISOString(),
    };
  }

  async listBans(
    serverId: string,
    actorUserId: string,
    options: {
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    await this.permissionService.requirePermission(
      serverId,
      actorUserId,
      ServerPermission.MEMBER_BAN,
    );

    const bans = await this.banRepository.listByServer(
      serverId,
      options.cursorId,
      options.limit,
    );

    return {
      items: bans.map((ban) => ({
        id: ban.id,
        userId: ban.userId,
        user: ban.user
          ? {
              id: ban.user.id,
              username: ban.user.username,
              displayName: ban.user.displayName,
              avatarUrl: ban.user.avatarUrl,
            }
          : null,
        reason: ban.reason,
        bannedById: ban.bannedById,
        createdAt: ban.createdAt.toISOString(),
      })),
    };
  }

  private assertTargetManageable(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      throw new BadRequestException('You cannot moderate yourself.');
    }
  }

  private async assertHierarchy(
    serverId: string,
    actorUserId: string,
    targetUserId: string,
  ) {
    const targetHighest = await this.memberRepository.findHighestRoleAny(
      serverId,
      targetUserId,
    );

    if (targetHighest?.name === 'Owner') {
      throw new ForbiddenException('You cannot moderate the server owner.');
    }

    if (targetHighest) {
      await this.hierarchyService.requireHigherRole(
        serverId,
        actorUserId,
        targetHighest.position,
      );
    }
  }
}
