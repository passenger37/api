import { serializeSession } from './e2ee-session.serializer';

describe('e2ee-session.serializer', () => {
  it('should serialize public session metadata only', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const result = serializeSession({
      id: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
      version: 1,
      sessionState: null,
      associatedDataHash: null,
      isActive: true,
      acceptedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      senderDevice: { userId: 'userA' },
      recipientDevice: { userId: 'userB' },
    } as any);

    expect(result).toEqual({
      sessionId: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
      senderUserId: 'userA',
      recipientUserId: 'userB',
      version: 1,
      isActive: true,
      acceptedAt: null,
      archivedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(result).not.toHaveProperty('rootKeyCiphertext');
    expect(result).not.toHaveProperty('chainKeyCiphertext');
  });
});
