import { Injectable } from '@nestjs/common';

import { ServerRolePermissionRepository } from '../repositories/server-role-permission.repository';

@Injectable()
export class ServerRolePermissionQueryService {
  constructor(private readonly repository: ServerRolePermissionRepository) {}
}
