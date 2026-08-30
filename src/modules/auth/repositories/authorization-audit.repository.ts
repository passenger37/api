import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { AuthorizationAudit } from '../interfaces/audit-log.interface';

@Injectable()
export class AuthorizationAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: AuthorizationAudit) {
    return this.prisma.authorizationAuditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        targetUserId: data.targetUserId,
        roleId: data.roleId,
        permissionId: data.permissionId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
      },
    });
  }
}
