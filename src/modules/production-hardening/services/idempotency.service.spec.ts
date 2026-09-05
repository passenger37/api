import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let redis: any;

  beforeEach(() => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new IdempotencyService(redis);
  });

  it('returns isFirstRequest: true for new key', async () => {
    const result = await service.checkAndMark({ key: 'test-key', ttlSeconds: 3600 });

    expect(result.isFirstRequest).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('idempotency:test-key', 'processing', 3600);
  });

  it('returns isFirstRequest: false for existing key', async () => {
    redis.get.mockResolvedValueOnce('{"data": "existing"}');

    const result = await service.checkAndMark({ key: 'test-key', ttlSeconds: 3600 });

    expect(result.isFirstRequest).toBe(false);
    expect(result.existingResult).toEqual({ data: 'existing' });
  });

  it('stores result correctly', async () => {
    await service.storeResult('test-key', { result: 'success' }, 3600);

    expect(redis.set).toHaveBeenCalledWith('idempotency:test-key', JSON.stringify({ result: 'success' }), 3600);
  });

  it('gets stored result', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify({ result: 'success' }));

    const result = await service.getResult('test-key');

    expect(result).toEqual({ result: 'success' });
  });

  it('removes key', async () => {
    await service.remove('test-key');

    expect(redis.del).toHaveBeenCalledWith('idempotency:test-key');
  });
});