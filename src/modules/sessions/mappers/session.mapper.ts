import { UserSession } from '@prisma/client';

import { SessionResponse } from '../dto/response/session.response';

export class SessionMapper {
  static toResponse(session: UserSession): SessionResponse {
    return {
      sessionId: session.sessionId,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
    };
  }
}
