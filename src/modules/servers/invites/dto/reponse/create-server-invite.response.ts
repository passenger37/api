export class CreateServerInviteResponse {
  code: string;

  inviteUrl: string;

  expiresAt?: Date;

  maxUses?: number;
}
