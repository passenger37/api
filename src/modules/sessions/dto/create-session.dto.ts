export class CreateSessionDto {
  userId: string;

  sessionId: string;

  refreshTokenJti: string;

  expiresAt: Date;

  deviceName?: string;

  userAgent?: string;

  ipAddress?: string;
}
