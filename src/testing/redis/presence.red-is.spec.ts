/**
 * Lecture 40.88 �?" Redis Integration Tests: Presence.
 *
 * Exercises the real `PresenceService`/`TypingService` against live Redis:
 * status round-trips, TTL-based presence expiry, offline/last-seen semantics,
 * invisible masking, and typing indicators.
 */

import { PresenceService, PresenceStatus } from '../../modules/messages/services/presence.service';
import { TypingService } from '../../modules/messages/services/typing.service';
import { createRedisTestHarness, RedisTestHarness } from './redis-test.harness';

describe('Redis Integration: Presence', () => {
  let harness: RedisTestHarness;

  beforeAll(async () => {
    harness = await createRedisTestHarness();
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  it('marks a user online and reads the status back', async () => {
    const presence = new PresenceService(harness.redis);
    const userId = `it:pres:user-online:${Date.now()}`;

    const online = await presence.markOnline(userId);
    expect(online.userId).toBe(userId);
    expect(online.status).toBe(PresenceStatus.ONLINE);
    expect(online.lastSeen).toEqual(expect.any(Number));

    const read = await presence.getStatus(userId);
    expect(read.status).toBe(PresenceStatus.ONLINE);
    expect(read.lastSeen).toEqual(expect.any(Number));
  });

  it('reports OFFLINE with a persisted last-seen after markOffline', async () => {
    const presence = new PresenceService(harness.redis);
    const userId = `it:pres:offline:${Date.now()}`;

    await presence.markOnline(userId);
    const off = await presence.markOffline(userId);
    expect(off.status).toBe(PresenceStatus.OFFLINE);

    const read = await presence.getStatus(userId);
    expect(read.status).toBe(PresenceStatus.OFFLINE);
    expect(read.lastSeen).toEqual(expect.any(Number));
    expect(read.lastSeen).toBeGreaterThan(0);
  });

  it('returns an empty last-seen for a never-seen user', async () => {
    const presence = new PresenceService(harness.redis);
    const read = await presence.getStatus(`it:pres:never:${Date.now()}`);
    expect(read.status).toBe(PresenceStatus.OFFLINE);
    expect(read.lastSeen).toBeNull();
  });

  it('masks INVISIBLE users as OFFLINE for visibility', async () => {
    const presence = new PresenceService(harness.redis);
    const userId = `it:pres:invisible:${Date.now()}`;

    await presence.setStatus(userId, PresenceStatus.INVISIBLE);

    const raw = await presence.getStatus(userId);
    expect(raw.status).toBe(PresenceStatus.INVISIBLE);

    const visible = await presence.getVisibleStatus(userId);
    expect(visible.status).toBe(PresenceStatus.OFFLINE);
  });

  it('expires presence under the TTL and falls back to OFFLINE', async () => {
    const presence = new PresenceService(harness.redis);
    const userId = `it:pres:ttl:${Date.now()}`;

    process.env.REDIS_TTL_PRESENCE_OVERRIDE = '1';
    // PresenceService TTL comes from REDIS_TTL.PRESENCE (module scope). Manually
    // write a short-TTL presence directly to verify the read-side expiry path.
    const raw = harness.raw;
    await raw.set(`user:${userId}:presence`, JSON.stringify({ status: 'ONLINE', lastSeen: Date.now() }), {
      EX: 1,
    });

    await expect(
      presence.getStatus(userId),
    ).resolves.toMatchObject({ status: PresenceStatus.ONLINE });

    await new Promise((r) => setTimeout(r, 1100));

    await expect(
      presence.getStatus(userId),
    ).resolves.toMatchObject({ status: PresenceStatus.OFFLINE });
  });

  it('starts and stops typing indicators', async () => {
    const typing = new TypingService(harness.redis);
    const channelId = `it:pres:typing-ch:${Date.now()}`;
    const userId = `it:pres:typing-user:${Date.now()}`;

    await typing.startTyping(channelId, userId);
    const key = `typing:${channelId}:${userId}`;
    expect(await harness.raw.exists(key)).toBe(1);

    await typing.stopTyping(channelId, userId);
    expect(await harness.raw.exists(key)).toBe(0);
  });
});
