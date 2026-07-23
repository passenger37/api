export class CreateSessionDto {
  userId: string;

  sessionId: string;

  refreshToken: string;

  expiresAt: Date;

  deviceName?: string;

  userAgent?: string;

  ipAddress?: string;
}
