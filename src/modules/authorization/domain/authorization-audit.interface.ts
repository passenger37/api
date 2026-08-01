export interface AuthorizationAuditData {
  actorId?: string;

  action: string;

  targetUserId?: string;

  roleId?: string;

  permissionId?: string;

  metadata?: Record<string, unknown>;
}
