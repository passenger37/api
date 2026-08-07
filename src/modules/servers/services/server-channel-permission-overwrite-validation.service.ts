import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';
import { ServerMemberQueryService } from './server-member-query.service';
import { ServerChannelRepository } from '../repositories/server-channel.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerChannelPermissionOverwriteRepository } from '../repositories/server-channel-permission-overwrite.repository';

@Injectable()
export class ServerChannelPermissionOverwriteValidationService {
  constructor(
    private readonly channelRepository: ServerChannelRepository,
    private readonly roleRepository: ServerRoleRepository,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly overwriteRepository: ServerChannelPermissionOverwriteRepository,
  ) {}

  async validateChannelExists(channelId: string) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    return channel;
  }

  async validateRoleExists(roleId: string) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return role;
  }

  async validateMemberExists(memberId: string) {
    const member = await this.memberQueryService.getMemberById(memberId);

    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    return member;
  }

  validateOverwriteTarget(roleId?: string, memberId?: string) {
    if (roleId && memberId) {
      throw new BadRequestException(
        'Overwrite cannot target both role and member.',
      );
    }

    if (!roleId && !memberId) {
      throw new BadRequestException(
        'Overwrite must target either role or member.',
      );
    }
  }

  validateAllowDeny(allow: boolean, deny: boolean) {
    if (allow === deny) {
      throw new BadRequestException(
        'Exactly one of allow or deny must be true.',
      );
    }
  }

  async validateDuplicateRoleOverwrite(
    channelId: string,
    roleId: string,
    permission: ServerPermission,
  ) {
    const existing = await this.overwriteRepository.findRoleOverwrite(
      channelId,
      roleId,
      permission,
    );

    if (existing) {
      throw new ConflictException('Role overwrite already exists.');
    }
  }

  async validateDuplicateMemberOverwrite(
    channelId: string,
    memberId: string,
    permission: ServerPermission,
  ) {
    const existing = await this.overwriteRepository.findMemberOverwrite(
      channelId,
      memberId,
      permission,
    );

    if (existing) {
      throw new ConflictException('Member overwrite already exists.');
    }
  }
}
