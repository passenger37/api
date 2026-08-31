import { KeyDistributionRepository } from './key-distribution.repository';

describe('KeyDistributionRepository', () => {
  let repository: KeyDistributionRepository;
  let prisma: {
    e2eeDevice: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let oneTimePreKeyRepo: {
    consumeNext: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      e2eeDevice: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    oneTimePreKeyRepo = {
      consumeNext: jest.fn(),
    };
    repository = new KeyDistributionRepository(
      prisma as any,
      oneTimePreKeyRepo as any,
    );
  });

  it('should fetch key bundles for a user with active signed prekey and prekey count', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    prisma.e2eeDevice.findMany.mockResolvedValue([
      {
        id: 'dev1',
        userId: 'userA',
        identityKeyPublic: 'ik1',
        isRevoked: false,
        createdAt,
        signedPreKeys: [
          {
            signedPreKeyId: 1,
            publicKey: 'spk1',
            signature: 'sig1',
            isActive: true,
          },
        ],
        _count: { oneTimePreKeys: 3 },
      },
    ]);

    const bundles = await repository.findKeyBundlesForUser('userA');

    expect(prisma.e2eeDevice.findMany).toHaveBeenCalledWith({
      where: { userId: 'userA', isRevoked: false },
      orderBy: { createdAt: 'asc' },
      include: {
        signedPreKeys: { where: { isActive: true }, take: 1 },
        _count: {
          select: { oneTimePreKeys: { where: { isConsumed: false } } },
        },
      },
    });
    expect(bundles).toEqual([
      {
        deviceId: 'dev1',
        identityKeyPublic: 'ik1',
        signedPrekey: {
          signedPreKeyId: 1,
          publicKey: 'spk1',
          signature: 'sig1',
        },
        oneTimePrekeyCount: 3,
      },
    ]);
  });

  it('should return null signedPrekey when no active signed prekey exists', async () => {
    prisma.e2eeDevice.findMany.mockResolvedValue([
      {
        id: 'dev1',
        userId: 'userA',
        identityKeyPublic: 'ik1',
        isRevoked: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        signedPreKeys: [],
        _count: { oneTimePreKeys: 0 },
      },
    ]);

    const bundles = await repository.findKeyBundlesForUser('userA');

    expect(bundles[0].signedPrekey).toBeNull();
    expect(bundles[0].oneTimePrekeyCount).toBe(0);
  });

  it('should claim one-time prekeys for valid devices', async () => {
    prisma.e2eeDevice.findFirst
      .mockResolvedValueOnce({ id: 'dev1' })
      .mockResolvedValueOnce({ id: 'dev2' });
    oneTimePreKeyRepo.consumeNext
      .mockResolvedValueOnce({ preKeyId: 1, publicKey: 'k1' })
      .mockResolvedValueOnce({ preKeyId: 2, publicKey: 'k2' })
      .mockResolvedValueOnce(null);

    const result = await repository.claimOneTimePrekeys('userA', [
      { deviceId: 'dev1', count: 2 },
      { deviceId: 'dev2', count: 1 },
    ]);

    expect(oneTimePreKeyRepo.consumeNext).toHaveBeenCalledTimes(3);
    expect(result.claimed).toEqual([
      {
        deviceId: 'dev1',
        preKeys: [
          { preKeyId: 1, publicKey: 'k1' },
          { preKeyId: 2, publicKey: 'k2' },
        ],
      },
      { deviceId: 'dev2', preKeys: [] },
    ]);
  });

  it('should return empty preKeys for non-existent or revoked device', async () => {
    prisma.e2eeDevice.findFirst.mockResolvedValue(null);

    const result = await repository.claimOneTimePrekeys('userA', [
      { deviceId: 'dev99', count: 5 },
    ]);

    expect(result.claimed).toEqual([{ deviceId: 'dev99', preKeys: [] }]);
    expect(oneTimePreKeyRepo.consumeNext).not.toHaveBeenCalled();
  });
});
