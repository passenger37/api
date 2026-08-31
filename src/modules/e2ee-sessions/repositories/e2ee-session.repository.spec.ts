import { E2eeSessionRepository } from './e2ee-session.repository';

describe('E2eeSessionRepository', () => {
  let repository: E2eeSessionRepository;
  let prisma: {
    e2eeSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      e2eeSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new E2eeSessionRepository(prisma as any);
  });

  it('should create a session with connect relations', async () => {
    prisma.e2eeSession.create.mockResolvedValue({
      id: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
      sessionState: 'state',
      associatedDataHash: 'hash',
      isActive: true,
    });

    const session = await repository.create({
      senderDevice: { connect: { id: 'dev1' } },
      recipientDevice: { connect: { id: 'dev2' } },
      sessionState: 'state',
      associatedDataHash: 'hash',
    });

    expect(prisma.e2eeSession.create).toHaveBeenCalledWith({
      data: {
        senderDevice: { connect: { id: 'dev1' } },
        recipientDevice: { connect: { id: 'dev2' } },
        sessionState: 'state',
        associatedDataHash: 'hash',
      },
    });
    expect(session.id).toBe('sess1');
  });

  it('should find session by id', async () => {
    prisma.e2eeSession.findUnique.mockResolvedValue({ id: 'sess1' });

    const session = await repository.findById('sess1');

    expect(prisma.e2eeSession.findUnique).toHaveBeenCalledWith({
      where: { id: 'sess1' },
    });
    expect(session).toEqual({ id: 'sess1' });
  });

  it('should find active session by device pair', async () => {
    prisma.e2eeSession.findFirst.mockResolvedValue({
      id: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
      isActive: true,
    });

    const session = await repository.findActiveByDevicePair('dev1', 'dev2');

    expect(prisma.e2eeSession.findFirst).toHaveBeenCalledWith({
      where: {
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
        isActive: true,
      },
    });
    expect(session?.id).toBe('sess1');
  });

  it('should list sessions for recipient device', async () => {
    prisma.e2eeSession.findMany.mockResolvedValue([{ id: 'sess1' }]);

    const sessions = await repository.findByRecipientDeviceId('dev2');

    expect(prisma.e2eeSession.findMany).toHaveBeenCalledWith({
      where: { recipientDeviceId: 'dev2', isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(sessions).toEqual([{ id: 'sess1' }]);
  });

  it('should list sessions for sender device', async () => {
    prisma.e2eeSession.findMany.mockResolvedValue([{ id: 'sess2' }]);

    const sessions = await repository.findBySenderDeviceId('dev1');

    expect(prisma.e2eeSession.findMany).toHaveBeenCalledWith({
      where: { senderDeviceId: 'dev1', isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(sessions).toEqual([{ id: 'sess2' }]);
  });

  it('should archive a session', async () => {
    prisma.e2eeSession.update.mockResolvedValue({
      id: 'sess1',
      isActive: false,
      archivedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    await repository.archive('sess1');

    expect(prisma.e2eeSession.update).toHaveBeenCalledWith({
      where: { id: 'sess1' },
      data: { isActive: false, archivedAt: expect.any(Date) },
    });
  });
});
