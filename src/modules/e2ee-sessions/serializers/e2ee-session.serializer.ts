import { E2eeSession, E2eeDevice } from '@prisma/client';
import { SessionResponseDto } from '../dto/session.response';

export type E2eeSessionWithDevices = E2eeSession & {
  senderDevice: E2eeDevice;
  recipientDevice: E2eeDevice;
};

export function serializeSession(
  session: E2eeSessionWithDevices,
): SessionResponseDto {
  return {
    sessionId: session.id,
    senderDeviceId: session.senderDeviceId,
    recipientDeviceId: session.recipientDeviceId,
    senderUserId: session.senderDevice.userId,
    recipientUserId: session.recipientDevice.userId,
    version: session.version,
    isActive: session.isActive,
    acceptedAt: session.acceptedAt?.toISOString() ?? null,
    archivedAt: session.archivedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
