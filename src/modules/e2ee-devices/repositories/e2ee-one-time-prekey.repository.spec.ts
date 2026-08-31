import { E2eeOneTimePreKeyRepository } from './e2ee-one-time-prekey.repository';

describe('E2eeOneTimePreKeyRepository', () => {
  let repository: E2eeOneTimePreKeyRepository;
  let prisma: {
    e2eeOneTimePreKey: {
      createMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      e2eeOneTimePreKey: {
        createMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    repository = new E2eeOneTimePreKeyRepository(prisma as any);
  });

  it('should add a batch of one-time prekeys, skipping duplicates', async () => {
    prisma.e2eeOneTimePreKey.createMany.mockResolvedValue({ count: 2 });
    const keys = [
      { preKeyId: 1, publicKey: 'k1' },
      { preKeyId: 2, publicKey: 'k2' },
    ];

    const added = await repository.addBatch('dev1', keys);

    expect(prisma.e2eeOneTimePreKey.createMany).toHaveBeenCalledWith({
      data: [
        { deviceId: 'dev1', preKeyId: 1, publicKey: 'k1' },
        { deviceId: 'dev1', preKeyId: 2, publicKey: 'k2' },
      ],
      skipDuplicates: true,
    });
    expect(added).toBe(2);
  });

  it('should count unconsumed one-time prekeys', async () => {
    prisma.e2eeOneTimePreKey.count.mockResolvedValue(5);

    const count = await repository.countUnconsumed('dev1');

    expect(prisma.e2eeOneTimePreKey.count).toHaveBeenCalledWith({
      where: { deviceId: 'dev1', isConsumed: false },
    });
    expect(count).toBe(5);
  });

  it('should return null when no unconsumed prekey exists', async () => {
    prisma.e2eeOneTimePreKey.findFirst.mockResolvedValue(null);

    const claimed = await repository.consumeNext('dev1');

    expect(claimed).toBeNull();
    expect(prisma.e2eeOneTimePreKey.updateMany).not.toHaveBeenCalled();
  });

  it('should claim the next unconsumed prekey atomically', async () => {
    const candidate = {
      id: 'pre1',
      deviceId: 'dev1',
      preKeyId: 1,
      publicKey: 'k1',
      isConsumed: false,
    };
    prisma.e2eeOneTimePreKey.findFirst.mockResolvedValue(candidate);
    prisma.e2eeOneTimePreKey.updateMany.mockResolvedValue({ count: 1 });

    const claimed = await repository.consumeNext('dev1');

    expect(prisma.e2eeOneTimePreKey.findFirst).toHaveBeenCalledWith({
      where: { deviceId: 'dev1', isConsumed: false },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });
    expect(prisma.e2eeOneTimePreKey.updateMany).toHaveBeenCalledWith({
      where: { id: 'pre1', isConsumed: false },
      data: { isConsumed: true, consumedAt: expect.any(Date) },
    });
    expect(claimed).toEqual(candidate);
  });

  it('should retry the next candidate when the claim loses a race', async () => {
    const candidate = {
      id: 'pre1',
      deviceId: 'dev1',
      preKeyId: 1,
      publicKey: 'k1',
      isConsumed: false,
    };
    prisma.e2eeOneTimePreKey.findFirst
      .mockResolvedValueOnce(candidate)
      .mockResolvedValueOnce(null);
    prisma.e2eeOneTimePreKey.updateMany.mockResolvedValue({ count: 0 });

    const claimed = await repository.consumeNext('dev1');

    expect(prisma.e2eeOneTimePreKey.findFirst).toHaveBeenCalledTimes(2);
    expect(claimed).toBeNull();
  });

  it('should stop retrying after exhausting attempts', async () => {
    const candidate = {
      id: 'pre1',
      deviceId: 'dev1',
      preKeyId: 1,
      publicKey: 'k1',
      isConsumed: false,
    };
    prisma.e2eeOneTimePreKey.findFirst.mockResolvedValue(candidate);
    prisma.e2eeOneTimePreKey.updateMany.mockResolvedValue({ count: 0 });

    const claimed = await repository.consumeNext('dev1', undefined, 0);

    expect(prisma.e2eeOneTimePreKey.findFirst).toHaveBeenCalledTimes(1);
    expect(claimed).toBeNull();
  });
});
