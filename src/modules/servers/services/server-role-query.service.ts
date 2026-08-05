import { Injectable, NotFoundException } from '@nestjs/common';

import { ServerRoleRepository } from '../repositories/server-role.repository';

@Injectable()
export class ServerRoleQueryService {
  constructor(private readonly roleRepository: ServerRoleRepository) {}

  async getById(roleId: string) {
    return this.roleRepository.findById(roleId);
  }

  async getByIdOrThrow(roleId: string) {
    const role = await this.getById(roleId);

    if (!role) {
      throw new NotFoundException('Server role not found.');
    }

    return role;
  }

  async exists(roleId: string): Promise<boolean> {
    return this.roleRepository.exists(roleId);
  }

  async getRoles(serverId: string) {
    return this.roleRepository.findByServer(serverId);
  }

  async countRoles(serverId: string): Promise<number> {
    return this.roleRepository.countByServer(serverId);
  }
}
