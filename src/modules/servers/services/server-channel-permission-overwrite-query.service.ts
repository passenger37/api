import { Injectable, NotFoundException } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ServerChannelPermissionOverwriteRepository } from '../repositories/server-channel-permission-overwrite.repository';

@Injectable()
export class ServerChannelPermissionOverwriteQueryService {
  constructor(
    private readonly repository: ServerChannelPermissionOverwriteRepository,
  ) {}

  async getOverwrite(overwriteId: string) {
    const overwrite = await this.repository.findById(overwriteId);

    if (!overwrite) {
      throw new NotFoundException('Permission overwrite not found.');
    }

    return overwrite;
  }

  async getChannelOverwrites(channelId: string) {
    return this.repository.findByChannel(channelId);
  }

  async getRoleOverwrite(
    channelId: string,
    roleId: string,
    permission: ServerPermission,
  ) {
    return this.repository.findRoleOverwrite(channelId, roleId, permission);
  }

  async getMemberOverwrite(
    channelId: string,
    memberId: string,
    permission: ServerPermission,
  ) {
    return this.repository.findMemberOverwrite(channelId, memberId, permission);
  }
}
