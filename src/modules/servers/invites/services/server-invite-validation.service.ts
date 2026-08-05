import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ServerRepository } from '../../repositories/server.repository';
import { ServerMemberRepository } from '../../repositories/server-member.repository';
import { ServerPermission } from '@prisma/client';

@Injectable()
export class ServerInviteValidationService {
  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly memberRepository: ServerMemberRepository,
  ) {}

  async validateServer(serverId: string): Promise<void> {
    const server = await this.serverRepository.findById(serverId);

    if (!server) {
      throw new NotFoundException('Server not found.');
    }
  }

  async validateMember(serverId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findByServerAndUser(
      serverId,
      userId,
    );

    if (!member) {
      throw new ForbiddenException('You are not a member of this server.');
    }
  }

  async validatePermission(serverId: string, userId: string): Promise<void> {
    // const allowed = await this.permissionService.hasPermission(
    //   serverId,
    //   userId,
    //   ServerPermission.CREATE_INVITE,
    //);
    // if (!allowed) {
    //   throw new ForbiddenException(
    //     'You do not have permission to create invites.',
    //   );
    // }
  }

  async validateRequest(
    maxUses?: number,
    expiresInHours?: number,
  ): Promise<void> {
    if (maxUses !== undefined && maxUses < 1) {
      throw new BadRequestException('maxUses must be greater than zero.');
    }

    if (expiresInHours !== undefined && expiresInHours <= 0) {
      throw new BadRequestException(
        'expiresInHours must be greater than zero.',
      );
    }
  }
}
