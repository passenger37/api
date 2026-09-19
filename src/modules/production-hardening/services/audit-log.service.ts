import { Injectable, Logger } from '@nestjs/common';
import { StructuredLogger } from '../../../core/logger/structured-logger';

export interface AuditLogEntry {
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly structuredLogger: StructuredLogger) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const level =
        entry.severity === 'CRITICAL' || entry.severity === 'HIGH'
          ? 'warn'
          : 'info';
      this.structuredLogger[level]({
        module: 'audit',
        operation: entry.action,
        userId: entry.userId,
        entityId: entry.resourceId,
        details: {
          ...entry.details,
          resourceType: entry.resourceType,
          severity: entry.severity,
          success: entry.success,
          errorMessage: entry.errorMessage,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
        message: `AUDIT: ${entry.action}`,
      });
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }
  }

  async logSecurityEvent(
    action: string,
    userId: string | undefined,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    success = true,
    errorMessage?: string,
  ): Promise<void> {
    await this.log({
      action,
      userId,
      details,
      ipAddress,
      userAgent,
      severity: success ? 'LOW' : 'HIGH',
      success,
      errorMessage,
    });
  }

  async logAuthEvent(
    action:
      | 'LOGIN'
      | 'LOGOUT'
      | 'LOGIN_FAILED'
      | 'PASSWORD_CHANGE'
      | 'TOKEN_REFRESH'
      | 'SESSION_REVOKED',
    userId: string,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    success = true,
    errorMessage?: string,
  ): Promise<void> {
    await this.log({
      action: `AUTH_${action}`,
      userId,
      details,
      ipAddress,
      userAgent,
      severity: success ? 'LOW' : 'MEDIUM',
      success,
      errorMessage,
    });
  }

  async logAdminAction(
    action: string,
    userId: string,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      action: `ADMIN_${action}`,
      userId,
      details,
      ipAddress,
      userAgent,
      severity: 'MEDIUM',
      success: true,
    });
  }

  async logDataAccess(
    action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT',
    resourceType: string,
    resourceId: string,
    userId: string,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      action: `DATA_${action}`,
      userId,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      severity:
        action === 'DELETE' ? 'HIGH' : action === 'EXPORT' ? 'MEDIUM' : 'LOW',
      success: true,
    });
  }
}
