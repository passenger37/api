import { ServerInvite } from '@prisma/client';

import { CreateServerInviteResponse } from '../dto/reponse/create-server-invite.response';

export class ServerInviteMapper {
  static toResponse(invite: ServerInvite): CreateServerInviteResponse {
    return {
      code: invite.code,

      inviteUrl: `${process.env.APP_URL}/invite/${invite.code}`,

      expiresAt: invite.expiresAt ?? undefined,

      maxUses: invite.maxUses ?? undefined,
    };
  }
}
