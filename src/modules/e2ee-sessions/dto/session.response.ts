export interface SessionResponseDto {
  sessionId: string;
  senderDeviceId: string;
  recipientDeviceId: string;
  senderUserId: string;
  recipientUserId: string;
  version: number;
  isActive: boolean;
  acceptedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
