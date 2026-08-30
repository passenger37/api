import { Injectable } from '@nestjs/common';

import { AuthorizationAuditRepository } from '../repositories/authorization-audit.repository';
import { AuthorizationAudit } from '../interfaces/audit-log.interface';

@Injectable()
export class AuthorizationAuditService {
  constructor(
    private readonly authorizationAuditRepository: AuthorizationAuditRepository,
  ) {}

  async log(data: AuthorizationAudit) {
    return this.authorizationAuditRepository.create(data);
  }

  async roleAssigned(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'ROLE_ASSIGNED',
    });
  }

  async roleRemoved(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'ROLE_REMOVED',
    });
  }

  async roleCreated(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'ROLE_CREATED',
    });
  }

  async roleDeleted(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'ROLE_DELETED',
    });
  }

  async permissionAssigned(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'PERMISSION_ASSIGNED',
    });
  }

  async permissionRemoved(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'PERMISSION_REMOVED',
    });
  }

  async permissionCreated(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'PERMISSION_CREATED',
    });
  }

  async permissionDeleted(data: AuthorizationAudit) {
    return this.log({
      ...data,
      action: 'PERMISSION_DELETED',
    });
  }
}
