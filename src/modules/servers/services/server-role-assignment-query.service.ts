import { Injectable } from '@nestjs/common';

import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';

@Injectable()
export class ServerRoleAssignmentQueryService {
  constructor(private readonly repository: ServerRoleAssignmentRepository) {}

  async getMemberRoles(memberId: string) {
    return this.repository.findRolesByMember(memberId);
  }
}
