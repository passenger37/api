import { E2eeDeviceQueryService } from './e2ee-device-query.service';

describe('E2eeDeviceQueryService', () => {
  let service: E2eeDeviceQueryService;
  let deviceRepository: {
    findByUserId: jest.Mock;
  };

  beforeEach(() => {
    deviceRepository = {
      findByUserId: jest.fn(),
    };
    service = new E2eeDeviceQueryService(deviceRepository as any);
  });

  it('should serialize all devices of a user', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    deviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev1',
        userId: 'userA',
        name: 'Laptop',
        platform: 'web',
        identityKeyPublic: 'ik',
        isRevoked: false,
        revokedAt: null,
        lastSeenAt: null,
        createdAt,
        updatedAt: createdAt,
        signedPreKeys: [
          {
            signedPreKeyId: 1,
            publicKey: 'spk',
            signature: 'sig',
          },
        ],
        _count: { oneTimePreKeys: 3 },
      },
    ]);

    const result = await service.listMyDevices('userA');

    expect(deviceRepository.findByUserId).toHaveBeenCalledWith('userA');
    expect(result).toEqual([
      {
        id: 'dev1',
        name: 'Laptop',
        platform: 'web',
        identityKeyPublic: 'ik',
        isRevoked: false,
        revokedAt: null,
        lastSeenAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        signedPreKey: {
          signedPreKeyId: 1,
          publicKey: 'spk',
          signature: 'sig',
        },
        oneTimePreKeyCount: 3,
      },
    ]);
  });

  it('should render a device without an active signed prekey', async () => {
    deviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev1',
        userId: 'userA',
        name: 'Phone',
        platform: 'ios',
        identityKeyPublic: 'ik',
        isRevoked: true,
        revokedAt: null,
        lastSeenAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        signedPreKeys: [],
        _count: { oneTimePreKeys: 0 },
      },
    ]);

    const result = await service.listMyDevices('userA');

    expect(result[0].signedPreKey).toBeNull();
    expect(result[0].oneTimePreKeyCount).toBe(0);
    expect(result[0].isRevoked).toBe(true);
  });
});
