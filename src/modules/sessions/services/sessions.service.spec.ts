import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { SessionsRepository } from '../repositories';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const repository = {
    findAllActiveByUserId: jest.fn(),
    findBySessionId: jest.fn(),
    revoke: jest.fn(),
  } as unknown as SessionsRepository;

  const service = new SessionsService(repository as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists active sessions for a user', async () => {
    (repository.findAllActiveByUserId as jest.Mock).mockResolvedValue([
      { sessionId: 'sid-1' },
      { sessionId: 'sid-2' },
    ]);

    await expect(service.listSessionsByUser('user-1')).resolves.toEqual([
      { sessionId: 'sid-1' },
      { sessionId: 'sid-2' },
    ]);
    expect(repository.findAllActiveByUserId).toHaveBeenCalledWith('user-1');
  });

  it('throws NotFoundException when revoking an unknown session', async () => {
    (repository.findBySessionId as jest.Mock).mockResolvedValue(null);

    await expect(
      service.revokeSessionIfOwned('user-1', 'sid-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.revoke).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when revoking another users session', async () => {
    (repository.findBySessionId as jest.Mock).mockResolvedValue({
      id: 'row-1',
      user: { id: 'user-2' },
    });

    await expect(
      service.revokeSessionIfOwned('user-1', 'sid-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.revoke).not.toHaveBeenCalled();
  });

  it('revokes an owned session', async () => {
    (repository.findBySessionId as jest.Mock).mockResolvedValue({
      id: 'row-1',
      user: { id: 'user-1' },
    });
    (repository.revoke as jest.Mock).mockResolvedValue({
      id: 'row-1',
      isRevoked: true,
    });

    await expect(
      service.revokeSessionIfOwned('user-1', 'sid-1'),
    ).resolves.toEqual({ id: 'row-1', isRevoked: true });
    expect(repository.revoke).toHaveBeenCalledWith('row-1');
  });
});
