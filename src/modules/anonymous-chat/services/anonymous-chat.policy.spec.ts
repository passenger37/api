import { AnonymousChatPolicy } from './anonymous-chat.policy';
import { AnonymousChatErrorCode } from '../types/anonymous-chat.types';

describe('AnonymousChatPolicy', () => {
  let service: AnonymousChatPolicy;
  let sessionRepo: any;
  let participantRepo: any;
  let redis: any;

  beforeEach(() => {
    sessionRepo = { findEngagedByUser: jest.fn().mockResolvedValue(null) };
    participantRepo = { findBySessionId: jest.fn().mockResolvedValue(null) };
    redis = { exists: jest.fn().mockResolvedValue(false) };

    service = new AnonymousChatPolicy(sessionRepo, participantRepo, redis);
  });

  it('rejects restricted users', async () => {
    redis.exists.mockResolvedValue(true);

    await expect(service.assertUserAllowed('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.NOT_ALLOWED,
    });
  });

  it('allows a WAITING session (idempotent re-join)', async () => {
    sessionRepo.findEngagedByUser.mockResolvedValue({ status: 'WAITING' });

    await expect(service.assertCanJoin('u1')).resolves.toBeUndefined();
  });

  it('rejects joining while already MATCHED', async () => {
    sessionRepo.findEngagedByUser.mockResolvedValue({ status: 'MATCHED' });

    await expect(service.assertCanJoin('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.ALREADY_ACTIVE,
    });
  });

  it('rejects a participant that does not exist', async () => {
    await expect(service.assertParticipant('u1', 's1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.NOT_PARTICIPANT,
    });
  });

  it('rejects when the session belongs to another user', async () => {
    participantRepo.findBySessionId.mockResolvedValue({
      id: 'p1',
      userId: 'other',
      sessionId: 's1',
      roomId: 'r1',
    });

    await expect(service.assertParticipant('u1', 's1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.NOT_PARTICIPANT,
    });
  });

  it('resolves the membership for the owning user', async () => {
    participantRepo.findBySessionId.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      sessionId: 's1',
      roomId: 'r1',
    });

    await expect(service.assertParticipant('u1', 's1')).resolves.toEqual({
      id: 'p1',
      sessionId: 's1',
      roomId: 'r1',
    });
  });
});
