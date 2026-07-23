import { Prisma } from '@prisma/client';

export interface AuthorizationAudit {
  actorId?: string;
  action: string;
  targetUserId?: string;
  roleId?: string;
  permissionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}
