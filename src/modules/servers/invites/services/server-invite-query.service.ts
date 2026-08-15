import { Injectable, NotFoundException } from '@nestjs/common';

import { ServerInvite } from '@prisma/client';

import { ServerInviteRepository } from '../repositories/server-invite.repository';
import { ServerInviteValidationService } from './server-invite-validation.service';

@Injectable()
export class ServerInviteQueryService {
  constructor(
    private readonly repository: ServerInviteRepository,
    private readonly validation: ServerInviteValidationService,
  ) {}

  async getInviteById(inviteId: string): Promise<ServerInvite> {
    return this.validation.validateInviteExists(inviteId);
  }

  async getInviteByCode(code: string): Promise<ServerInvite> {
    return this.validation.validateInviteCode(code);
  }

  async getServerInvites(serverId: string): Promise<ServerInvite[]> {
    return this.repository.findByServer(serverId);
  }

  async resolveInvite(code: string) {
    const invite = await this.repository.findByCodeWithServer(code);

    if (!invite) {
      throw new NotFoundException('Invite not found.');
    }

    this.validation.validateInvite(invite);

    return invite;
  }
}
