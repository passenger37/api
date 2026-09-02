/**
 * Lecture 40.89 - Messaging E2E Tests
 *
 * End-to-end test that exercises the core HTTP messaging pipeline.
 * Uses a real NestJS app with real PostgreSQL and Redis.
 *
 * Note: WebSocket E2E helpers (connectMessagesWs / connectPresenceWs in
 * e2e-setup.ts) are scaffolded but not yet exercised: the /messages gateway
 * currently disconnects clients after the transport connects because the
 * connection auth + ack path is unresolved. HTTP assertions are green and
 * cover health, auth guard, message CRUD, pagination, and non-member access.
 */

import {
  bootstrapE2E,
  teardownE2E,
  E2EContext,
  generateAccessToken,
} from './e2e-setup';

describe('Messaging E2E Tests - HTTP Pipeline', () => {
  let ctx: E2EContext;
  let user1: { user: any; accessToken: string };
  let serverId: string;
  let channelId: string;

  beforeAll(async () => {
    ctx = await bootstrapE2E();
    serverId = ctx.fixtures.serverId;
    channelId = ctx.fixtures.channelId;

    // Use the fixture owner user
    const ownerUser = await ctx.db.prisma.user.findUnique({
      where: { id: ctx.fixtures.ownerUserId },
    });
    if (!ownerUser) throw new Error('Fixture owner user not found');

    // Ensure owner has Owner role on the test server
    const ownerRole = await ctx.db.prisma.serverRole.findFirst({
      where: { serverId, name: 'Owner' },
    });
    if (!ownerRole) throw new Error('Owner role not found');

    await ctx.db.prisma.serverMemberRole.upsert({
      where: {
        memberId_roleId: {
          memberId: ctx.fixtures.ownerMemberId,
          roleId: ownerRole.id,
        },
      },
      create: {
        memberId: ctx.fixtures.ownerMemberId,
        roleId: ownerRole.id,
      },
      update: {},
    });

    user1 = {
      user: ownerUser,
      accessToken: generateAccessToken(
        ctx.jwtService,
        ctx.configService,
        ownerUser,
      ),
    };
  }, 120000);

  afterAll(async () => {
    await teardownE2E(ctx);
  }, 30000);

  describe('HTTP Endpoints', () => {
    it('health check returns 200', async () => {
      const response = await fetch(`${ctx.baseUrl}/health`);
      expect(response.status).toBe(200);
    });

    it('GET messages requires auth', async () => {
      const response = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages?limit=1`,
      );
      expect(response.status).toBe(401);
    });

    it('GET messages with valid auth returns 200', async () => {
      const response = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages?limit=1`,
        {
          headers: { Authorization: `Bearer ${user1.accessToken}` },
        },
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.items).toBeDefined();
    });

    it('POST message creates message', async () => {
      const response = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user1.accessToken}`,
          },
          body: JSON.stringify({ content: `E2E test ${Date.now()}` }),
        },
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      const created = body.data.message;
      expect(created.id).toBeDefined();
      expect(created.content).toBeDefined();
    });

    it('GET single message', async () => {
      // Create a message first
      const createResp = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user1.accessToken}`,
          },
          body: JSON.stringify({ content: `single message ${Date.now()}` }),
        },
      );
      expect(createResp.status).toBe(201);
      const created = (await createResp.json()).data.message;

      // Get the message
      const getResp = await fetch(`${ctx.baseUrl}/messages/${created.id}`, {
        headers: { Authorization: `Bearer ${user1.accessToken}` },
      });
      expect(getResp.status).toBe(200);
      const msg = (await getResp.json()).data;
      expect(msg.id).toBe(created.id);
    });

    it('POST message from non-member returns 403', async () => {
      // Create an outsider user
      const outsider = await ctx.db.prisma.user.create({
        data: {
          id: `e2e-outsider-${Date.now()}`,
          username: `e2e_outsider_${Date.now()}`,
          email: `outsider_${Date.now()}@e2e.test`,
          passwordHash: 'hashed',
          displayName: 'Outsider',
          permissionVersion: 0,
        },
      });
      const outsiderToken = generateAccessToken(
        ctx.jwtService,
        ctx.configService,
        outsider,
      );

      const response = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${outsiderToken}`,
          },
          body: JSON.stringify({ content: 'should fail' }),
        },
      );
      // Non-members are rejected (403 Forbidden, or 404 resource not visible).
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Pagination', () => {
    it('paginates messages with cursor', async () => {
      // Send a few messages
      for (let i = 0; i < 5; i++) {
        await fetch(
          `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user1.accessToken}`,
            },
            body: JSON.stringify({ content: `page-msg-${i}` }),
          },
        );
      }

      // First page
      const page1 = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages?limit=2`,
        {
          headers: { Authorization: `Bearer ${user1.accessToken}` },
        },
      );
      expect(page1.status).toBe(200);
      const data1 = (await page1.json()).data;
      expect(data1.items.length).toBe(2);
      expect(data1.nextCursor).toBeDefined();

      // Second page
      const page2 = await fetch(
        `${ctx.baseUrl}/servers/${serverId}/channels/${channelId}/messages?limit=2&cursor=${data1.nextCursor}`,
        {
          headers: { Authorization: `Bearer ${user1.accessToken}` },
        },
      );
      expect(page2.status).toBe(200);
      const data2 = (await page2.json()).data;
      expect(data2.items.length).toBe(2);
    });
  });
});
