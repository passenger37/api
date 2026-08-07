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

  async validateInviteExists(inviteId: string): Promise<ServerInvite> {
    const invite = await this.inviteRepository.findById(inviteId);

    if (!invite) {
      throw new NotFoundException('Invite not found.');
    }

    return invite;
  }

  async validateInviteCode(code: string): Promise<ServerInvite> {
    const invite = await this.inviteRepository.findByCode(code);

    if (!invite) {
      throw new NotFoundException('Invite not found.');
    }

    return invite;
  }

  validateInviteNotRevoked(invite: ServerInvite): void {
    if (invite.revoked) {
      throw new BadRequestException('Invite has been revoked.');
    }
  }

  validateInviteNotExpired(invite: ServerInvite): void {
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite has expired.');
    }
  }

  validateInviteUses(invite: ServerInvite): void {
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new BadRequestException(
        'Invite has reached its maximum number of uses.',
      );
    }
  }

  async validateCanCreateInvite(
    serverId: string,
    userId: string,
  ): Promise<void> {
    const allowed = await this.permissionService.hasPermission(
      serverId,
      userId,
      ServerPermission.INVITE_CREATE,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to create invites.',
      );
    }
  }

  async validateCanDeleteInvite(
    serverId: string,
    userId: string,
  ): Promise<void> {
    const allowed = await this.permissionService.hasPermission(
      serverId,
      userId,
      ServerPermission.INVITE_DELETE,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to delete invites.',
      );
    }
  }

  validateInvite(invite: ServerInvite): void {
    this.validateInviteNotRevoked(invite);
    this.validateInviteNotExpired(invite);
    this.validateInviteUses(invite);
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
