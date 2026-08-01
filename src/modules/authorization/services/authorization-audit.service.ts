import { Injectable } from '@nestjs/common';

import { AuthorizationRepository } from '../repositories/authorization.repository';

import { AuthorizationAuditData } from '../domain/authorization-audit.interface';

@Injectable()
export class AuthorizationAuditService {
  constructor(private readonly repository: AuthorizationRepository) {}

  async log(data: AuthorizationAuditData) {
    await this.repository.createAuditLog(data);
  }
}
