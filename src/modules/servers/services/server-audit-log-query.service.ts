import { Injectable } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ModerationAuditRepository } from '../repositories/moderation-audit.repository';
import { ServerPermissionService } from './server-permission.service';

@Injectable()
export class ServerAuditLogQueryService {
  constructor(
    private readonly auditRepository: ModerationAuditRepository,

    private readonly permissionService: ServerPermissionService,
  ) {}

  async getAuditLogs(
    serverId: string,
    userId: string,
    options: {
      action?: string;
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.AUDIT_LOG_VIEW,
    );

    const logs = await this.auditRepository.listByServer(serverId, {
      action: options.action as never,
      cursorId: options.cursorId,
      limit: options.limit,
    });

    return {
      items: logs.map((log) => ({
        id: log.id,
        serverId: log.serverId,
        actorMemberId: log.actorMemberId,
        actorUser: log.actor?.user
          ? {
              id: log.actor.user.id,
              username: log.actor.user.username,
              displayName: log.actor.user.displayName,
            }
          : null,
        action: log.action,
        targetUserId: log.targetUserId,
        targetMemberId: log.targetMemberId,
        reason: log.reason,
        metadata: log.metadata ?? undefined,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}
