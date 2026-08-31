import { E2eeDeviceRepository } from './e2ee-device.repository';

describe('E2eeDeviceRepository', () => {
  let repository: E2eeDeviceRepository;
  let prisma: {
    e2eeDevice: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      e2eeDevice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new E2eeDeviceRepository(prisma as any);
  });

  it('should create a device with keys include', async () => {
    prisma.e2eeDevice.create.mockResolvedValue({
      id: 'dev1',
      userId: 'userA',
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
    });

    const device = await repository.create({
      userId: 'userA',
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
    });

    expect(prisma.e2eeDevice.create).toHaveBeenCalledWith({
      data: {
        userId: 'userA',
        name: 'Laptop',
        platform: 'web',
        identityKeyPublic: 'ik',
      },
      include: {
        signedPreKeys: {
          where: { isActive: true },
          take: 1,
        },
        _count: {
          select: {
            oneTimePreKeys: { where: { isConsumed: false } },
          },
        },
      },
    });
    expect(device.id).toBe('dev1');
  });

  it('should use the primary prisma client when no transaction is passed', async () => {
    prisma.e2eeDevice.create.mockResolvedValue({ id: 'dev1' });

    await repository.create({
      userId: 'userA',
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
    });

    expect(prisma.e2eeDevice.create).toHaveBeenCalled();
  });

  it('should find a device by id', async () => {
    prisma.e2eeDevice.findUnique.mockResolvedValue({ id: 'dev1' });

    const device = await repository.findById('dev1');

    expect(prisma.e2eeDevice.findUnique).toHaveBeenCalledWith({
      where: { id: 'dev1' },
    });
    expect(device).toEqual({ id: 'dev1' });
  });

  it('should find an active (non-revoked) device by id', async () => {
    prisma.e2eeDevice.findFirst.mockResolvedValue({ id: 'dev1' });

    const device = await repository.findActiveById('dev1');

    expect(prisma.e2eeDevice.findFirst).toHaveBeenCalledWith({
      where: { id: 'dev1', isRevoked: false },
    });
    expect(device).toEqual({ id: 'dev1' });
  });

  it('should list devices ordered by creation', async () => {
    prisma.e2eeDevice.findMany.mockResolvedValue([{ id: 'dev1' }]);

    const devices = await repository.findByUserId('userA');

    expect(prisma.e2eeDevice.findMany).toHaveBeenCalledWith({
      where: { userId: 'userA' },
      orderBy: { createdAt: 'asc' },
      include: {
        signedPreKeys: {
          where: { isActive: true },
          take: 1,
        },
        _count: {
          select: {
            oneTimePreKeys: { where: { isConsumed: false } },
          },
        },
      },
    });
    expect(devices).toEqual([{ id: 'dev1' }]);
  });

  it('should count non-revoked devices for a user', async () => {
    prisma.e2eeDevice.count.mockResolvedValue(2);

    const count = await repository.countForUser('userA');

    expect(prisma.e2eeDevice.count).toHaveBeenCalledWith({
      where: { userId: 'userA', isRevoked: false },
    });
    expect(count).toBe(2);
  });

  it('should mark a device revoked idempotently', async () => {
    prisma.e2eeDevice.update.mockResolvedValue({
      id: 'dev1',
      isRevoked: true,
      revokedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    await repository.markRevoked('dev1');

    expect(prisma.e2eeDevice.update).toHaveBeenCalledWith({
      where: { id: 'dev1' },
      data: {
        isRevoked: true,
        revokedAt: expect.any(Date),
      },
    });
  });
});
