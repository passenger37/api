import { RedisNodeRegistry, resolveNodeId, nodeHeartbeatTtlSec } from './redis-node-registry';
import { RedisService } from './redis.service';
import { redisKeys } from './redis-keys';

describe('RedisNodeRegistry', () => {
  const client = {
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    get: jest.fn(),
  };

  const redis = {
    getClient: jest.fn().mockReturnValue(client),
    waitUntilReady: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves a stable node id from NODE_ID', () => {
    expect(resolveNodeId({ NODE_ID: 'node-42' })).toBe('node-42');
  });

  it('derives a fallback node id when NODE_ID is absent', () => {
    const id = resolveNodeId({});
    expect(id).toBeTruthy();
    expect(id).toContain(':');
  });

  it('uses the default heartbeat TTL when unset', () => {
    expect(nodeHeartbeatTtlSec({})).toBe(30);
  });

  it('honours a NODE_HEARTBEAT_TTL_SEC override', () => {
    expect(nodeHeartbeatTtlSec({ NODE_HEARTBEAT_TTL_SEC: '45' })).toBe(45);
  });

  it('registers this node with an EX heartbeat', async () => {
    (client.set as jest.Mock).mockResolvedValue('OK');
    const registry = new RedisNodeRegistry(redis);
    await registry.register();

    const [key, value, opts] = client.set.mock.calls[0];
    expect(key).toBe(redisKeys.node(registry.instanceId()));
    expect(JSON.parse(value).nodeId).toBe(registry.instanceId());
    expect(opts).toEqual({ EX: 30 });
  });

  it('deregisters this node', async () => {
    (client.del as jest.Mock).mockResolvedValue(1);
    const registry = new RedisNodeRegistry(redis);
    await registry.deregister();
    expect(client.del).toHaveBeenCalledWith(redisKeys.node(registry.instanceId()));
  });

  it('lists live instances sorted by node id', async () => {
    (client.keys as jest.Mock).mockResolvedValue(['node:b', 'node:a']);
    (client.get as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ nodeId: 'b' }))
      .mockResolvedValueOnce(JSON.stringify({ nodeId: 'a' }));

    const registry = new RedisNodeRegistry(redis);
    const nodes = await registry.listInstances();
    expect(nodes.map((n) => n.nodeId)).toEqual(['a', 'b']);
  });

  it('counts live instances', async () => {
    (client.keys as jest.Mock).mockResolvedValue(['node:a', 'node:b', 'node:c']);
    (client.get as jest.Mock).mockResolvedValue(JSON.stringify({ nodeId: 'x' }));

    const registry = new RedisNodeRegistry(redis);
    await expect(registry.countInstances()).resolves.toBe(3);
    expect(registry.instanceId()).toBeTruthy();
  });

  it('skips malformed node records during listing', async () => {
    (client.keys as jest.Mock).mockResolvedValue(['node:bad']);
    (client.get as jest.Mock).mockResolvedValue('not-json');

    const registry = new RedisNodeRegistry(redis);
    await expect(registry.listInstances()).resolves.toEqual([]);
  });
});
