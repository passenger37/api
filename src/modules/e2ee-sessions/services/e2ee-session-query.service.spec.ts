import { E2eeSessionQueryService } from './e2ee-session-query.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('E2eeSessionQueryService', () => {
  let service: E2eeSessionQueryService;
  let repo: {
    findById: jest.Mock;
    findBySenderDeviceId: jest.Mock;
    findByRecipientDeviceId: jest.Mock;
  };
  let deviceRepo: { findById: jest.Mock };

  const now = new Date('2026-01-01T00:00:00.000Z');

  function session(overrides: Record<string, unknown> = {}) {
    return {
      id: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
      version: 1,
      isActive: true,
      acceptedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      senderDevice: { id: 'dev1', userId: 'userA' },
      recipientDevice: { id: 'dev2', userId: 'userB' },
      ...overrides,
    };
  }

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySenderDeviceId: jest.fn(),
      findByRecipientDeviceId: jest.fn(),
    };
    deviceRepo = { findById: jest.fn() };
    service = new E2eeSessionQueryService(repo as any, deviceRepo as any);
  });

  it('should return a serialized session without any key material', async () => {
    repo.findById.mockResolvedValue(session());

    const result = await service.getSessionById('sess1', 'userA');

    expect(repo.findById).toHaveBeenCalledWith('sess1');
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

  it('should throw NotFoundException when session not found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getSessionById('sess1', 'userA')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should hide sessions the caller is not a participant of', async () => {
    repo.findById.mockResolvedValue(session());

    await expect(service.getSessionById('sess1', 'mallory')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should reject listing sessions for a device the caller does not own', async () => {
    deviceRepo.findById.mockResolvedValue({ id: 'dev1', userId: 'mallory' });

    await expect(
      service.listSessionsForDevice('dev1', 'userA'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should list sessions for a device the caller owns', async () => {
    deviceRepo.findById.mockResolvedValue({ id: 'dev1', userId: 'userA' });
    repo.findBySenderDeviceId.mockResolvedValue([session()]);
    repo.findByRecipientDeviceId.mockResolvedValue([]);

    const result = await service.listSessionsForDevice('dev1', 'userA');

    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe('sess1');
  });
});
