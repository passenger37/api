import { E2eeSignedPreKeyRepository } from './e2ee-signed-prekey.repository';

describe('E2eeSignedPreKeyRepository', () => {
  let repository: E2eeSignedPreKeyRepository;
  let prisma: {
    e2eeSignedPreKey: {
      create: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const key = {
    signedPreKeyId: 2,
    publicKey: 'spk-public',
    signature: 'spk-signature',
  };

  beforeEach(() => {
    prisma = {
      e2eeSignedPreKey: {
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    repository = new E2eeSignedPreKeyRepository(prisma as any);
  });

  it('should create the initial active signed prekey', async () => {
    prisma.e2eeSignedPreKey.create.mockResolvedValue({
      id: 'spk1',
      deviceId: 'dev1',
      ...key,
      isActive: true,
    });

    const created = await repository.createInitial('dev1', key);

    expect(prisma.e2eeSignedPreKey.create).toHaveBeenCalledWith({
      data: {
        deviceId: 'dev1',
        ...key,
        isActive: true,
      },
    });
    expect(created.isActive).toBe(true);
  });

  it('should find the active signed prekey', async () => {
    prisma.e2eeSignedPreKey.findFirst.mockResolvedValue({
      id: 'spk1',
      deviceId: 'dev1',
    });

    const found = await repository.findActive('dev1');

    expect(prisma.e2eeSignedPreKey.findFirst).toHaveBeenCalledWith({
      where: { deviceId: 'dev1', isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(found?.deviceId).toBe('dev1');
  });

  it('should rotate: deactivate the previous active key, then create a new active one', async () => {
    prisma.e2eeSignedPreKey.updateMany.mockResolvedValue({ count: 1 });
    prisma.e2eeSignedPreKey.create.mockResolvedValue({
      id: 'spk2',
      deviceId: 'dev1',
      ...key,
      isActive: true,
    });

    const created = await repository.rotate('dev1', key);

    expect(prisma.e2eeSignedPreKey.updateMany).toHaveBeenCalledWith({
      where: { deviceId: 'dev1', isActive: true },
      data: { isActive: false, rotatedAt: expect.any(Date) },
    });
    expect(prisma.e2eeSignedPreKey.create).toHaveBeenCalledWith({
      data: {
        deviceId: 'dev1',
        ...key,
        isActive: true,
      },
    });
    expect(created.id).toBe('spk2');
  });
});
