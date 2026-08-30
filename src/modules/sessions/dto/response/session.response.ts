export class SessionResponse {
  sessionId: string;

  deviceName?: string | null;

  ipAddress?: string | null;

  userAgent?: string | null;

  createdAt: Date;

  lastUsedAt: Date;

  expiresAt: Date;
}
