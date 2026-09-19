import { RedisLockService } from './redis-lock.service';
import { RedisService } from './redis.service';

describe('RedisLockService', () => {
  const evalClient = {
    set: jest.fn(),
    eval: jest.fn(),
  };

  const redis = {
    getClient: jest.fn().mockReturnValue(evalClient),
  } as unknown as RedisService;

  const service = new RedisLockService(redis);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acquires a lock using SET NX PX', async () => {
    evalClient.set.mockResolvedValue('OK');

    await expect(service.acquire('job-1', 'token-1', 30_000)).resolves.toBe(
      true,
    );
    expect(evalClient.set).toHaveBeenCalledWith('lock:job-1', 'token-1', {
      NX: true,
      PX: 30_000,
    });
  });

  it('fails to acquire a lock already held elsewhere', async () => {
    evalClient.set.mockResolvedValue(null);

    await expect(service.acquire('job-1', 'token-2', 30_000)).resolves.toBe(
      false,
    );
  });

  it('releases a lock with a compare-and-delete script', async () => {
    evalClient.eval.mockResolvedValue(1);

    await service.release('job-1', 'token-1');

    expect(evalClient.eval).toHaveBeenCalledWith(
      expect.stringContaining('if redis.call'),
      { keys: ['lock:job-1'], arguments: ['token-1'] },
    );
  });

  it('executes the exclusive job only when the lock is acquired', async () => {
    evalClient.set.mockResolvedValue('OK');
    evalClient.eval.mockResolvedValue(1);

    const job = jest.fn().mockResolvedValue(42);

    await expect(service.runExclusive('job-1', 30_000, job)).resolves.toEqual({
      executed: true,
      result: 42,
    });
    expect(job).toHaveBeenCalledTimes(1);
    expect(evalClient.eval).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ keys: ['lock:job-1'] }),
    );
  });

  it('skips the job when another instance holds the lock', async () => {
    evalClient.set.mockResolvedValue(null);

    const job = jest.fn().mockResolvedValue(42);

    await expect(service.runExclusive('job-1', 30_000, job)).resolves.toEqual({
      executed: false,
      result: null,
    });
    expect(job).not.toHaveBeenCalled();
  });

  it('releases the lock even when the job throws', async () => {
    evalClient.set.mockResolvedValue('OK');
    evalClient.eval.mockResolvedValue(1);

    const job = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(service.runExclusive('job-1', 30_000, job)).rejects.toThrow(
      'boom',
    );
    expect(evalClient.eval).toHaveBeenCalled();
  });
});
