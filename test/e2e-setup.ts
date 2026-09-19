/**
 * Lecture 40.89 - Messaging E2E Tests.
 *
 * Shared E2E test utilities: JWT token generation, socket.io client wrapper,
 * test fixture creation via DB harness, and common assertions.
 */

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

import { createTestApp, closeTestApp } from './app';
import {
  createDbTestHarness,
  DbTestContext,
} from '../src/testing/db/db-test.harness';
import {
  createRedisTestHarness,
  RedisTestHarness,
} from '../src/testing/redis/redis-test.harness';
import {
  seedDbFixture,
  createChannel,
  DbFixture,
} from '../src/testing/db/db-test.fixtures';
import { User, Role } from '@prisma/client';

export interface E2EContext {
  app: Awaited<ReturnType<typeof createTestApp>>;
  httpServer: any;
  baseUrl: string;
  db: DbTestContext;
  redis: RedisTestHarness;
  fixtures: DbFixture;
  jwtService: JwtService;
  configService: ConfigService;
}

export interface TestUser {
  user: User;
  accessToken: string;
}

export interface WsClient {
  socket: Socket;
  userId: string;
  accessToken: string;
  events: Map<string, any[]>;
  onEvent(event: string, handler: (data: any) => void): void;
  emitWithAck(event: string, data: any, timeout?: number): Promise<any>;
  waitForEvent(event: string, timeout?: number): Promise<any>;
  disconnect(): Promise<void>;
}

/**
 * Bootstrap the E2E test environment with real NestJS app, DB, and Redis.
 */
export async function bootstrapE2E(): Promise<E2EContext> {
  // Initialize integration harnesses for real infrastructure
  const db = await createDbTestHarness();
  const redis = await createRedisTestHarness();

  // Seed deterministic test fixtures
  const fixtures = await seedDbFixture(db.prisma);

  // Seed required roles for the test server
  await seedRoles(db.prisma, fixtures.serverId);

  // Point the app at the isolated schema before boot
  process.env.DATABASE_URL = db.url;

  const app = await createTestApp();
  const httpServer = app.getHttpServer();
  const baseUrl = `http://localhost:${httpServer.address()?.port}`;

  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);

  return {
    app,
    httpServer,
    baseUrl,
    db,
    redis,
    fixtures,
    jwtService,
    configService,
  };
}

async function seedRoles(
  prisma: DbTestContext['prisma'],
  serverId: string,
): Promise<void> {
  const roles = [
    { name: 'Owner', position: 0 },
    { name: 'Admin', position: 1 },
    { name: 'Moderator', position: 2 },
    { name: 'Member', position: 3 },
    { name: 'SUPER_ADMIN', position: -1 },
  ];

  for (const role of roles) {
    const created = await prisma.serverRole.create({
      data: { ...role, serverId },
    });

    // Owner/Admin/SUPER_ADMIN get full access via the ADMINISTRATOR
    // shortcut (ServerPermissionResolverService returns all permissions).
    if (
      role.name === 'Owner' ||
      role.name === 'Admin' ||
      role.name === 'SUPER_ADMIN'
    ) {
      await prisma.serverRolePermission.create({
        data: {
          roleId: created.id,
          permission: 'ADMINISTRATOR',
        },
      });
    }
  }
}

/**
 * Clean up the E2E test environment.
 */
export async function teardownE2E(ctx: E2EContext): Promise<void> {
  await closeTestApp(ctx.app);
  await ctx.redis.cleanup();
  await ctx.db.cleanup();
}

/**
 * Generate a JWT access token for a test user.
 */
export function generateAccessToken(
  jwtService: JwtService,
  configService: ConfigService,
  user: User,
): string {
  const payload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    permissionVersion: user.permissionVersion ?? 0,
  };

  const secret = configService.getOrThrow<string>('jwt.accessToken.secret');
  const expiresIn = configService.getOrThrow<string>(
    'jwt.accessToken.expiresIn',
  );
  return jwtService.sign(payload, { secret, expiresIn } as any);
}

/**
 * Create a test user and generate its access token.
 */
export async function createTestUser(
  prisma: DbTestContext['prisma'],
  jwtService: JwtService,
  configService: ConfigService,
  overrides: Partial<{ username: string; email: string }> = {},
): Promise<TestUser> {
  const username = overrides.username ?? `e2e_user_${uuidv4().slice(0, 8)}`;
  const email = overrides.email ?? `${username}@e2e.test`;

  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      username,
      email,
      passwordHash: 'hashed',
      displayName: username,
      permissionVersion: 0,
    },
  });

  const accessToken = generateAccessToken(jwtService, configService, user);
  return { user, accessToken };
}

/**
 * Create a test user with a specific role on the test server.
 */
export async function createTestUserWithRole(
  prisma: DbTestContext['prisma'],
  jwtService: JwtService,
  configService: ConfigService,
  serverId: string,
  roleName: 'Owner' | 'Admin' | 'Moderator' | 'Member',
  overrides: Partial<{ username: string; email: string }> = {},
): Promise<TestUser> {
  const username =
    overrides.username ??
    `e2e_${roleName.toLowerCase()}_${uuidv4().slice(0, 8)}`;
  const email = overrides.email ?? `${username}@e2e.test`;

  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      username,
      email,
      passwordHash: 'hashed',
      displayName: username,
      permissionVersion: 0,
    },
  });

  const role = await prisma.serverRole.findFirst({
    where: { serverId, name: roleName },
  });
  if (!role) throw new Error(`Role ${roleName} not found`);

  await prisma.serverMember.create({
    data: {
      userId: user.id,
      serverId,
      roles: { create: { roleId: role.id } },
    },
  });

  const accessToken = generateAccessToken(jwtService, configService, user);
  return { user, accessToken };
}

/**
 * Connect a socket.io client to the /messages namespace with auth.
 */
export function connectMessagesWs(
  baseUrl: string,
  accessToken: string,
  userId: string,
): WsClient {
  const socket = io(`${baseUrl}/messages`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });

  const events = new Map<string, any[]>();

  socket.onAny((eventName, ...args) => {
    const arr = events.get(eventName) ?? [];
    arr.push(args.length === 1 ? args[0] : args);
    events.set(eventName, arr);
  });

  const wsClient: WsClient = {
    socket,
    userId,
    accessToken,
    events,
    onEvent(eventName, handler) {
      socket.on(eventName, handler);
    },
    async emitWithAck(event, data, timeout = 5000) {
      return new Promise((resolve, reject) => {
        socket.emit(event, data, (response) => {
          if (response?.success === false) {
            reject(new Error(response.error?.message ?? 'WS request failed'));
          } else {
            resolve(response);
          }
        });
        setTimeout(
          () => reject(new Error(`Timeout waiting for ${event} ack`)),
          timeout,
        );
      });
    },
    async waitForEvent(eventName, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const existing = events.get(eventName);
        if (existing && existing.length > 0) {
          resolve(existing.shift());
          return;
        }
        const handler = (data: any) => {
          socket.off(eventName, handler);
          resolve(data);
        };
        socket.on(eventName, handler);
        setTimeout(() => {
          socket.off(eventName, handler);
          reject(new Error(`Timeout waiting for event ${eventName}`));
        }, timeout);
      });
    },
    async disconnect() {
      socket.disconnect();
      await new Promise((r) => setTimeout(r, 50));
    },
  };

  return wsClient;
}

/**
 * Connect a socket.io client to the /presence namespace with auth.
 */
export function connectPresenceWs(
  baseUrl: string,
  accessToken: string,
  userId: string,
): WsClient {
  const socket = io(`${baseUrl}/presence`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });

  const events = new Map<string, any[]>();

  socket.onAny((eventName, ...args) => {
    const arr = events.get(eventName) ?? [];
    arr.push(args.length === 1 ? args[0] : args);
    events.set(eventName, arr);
  });

  return {
    socket,
    userId,
    accessToken,
    events,
    onEvent(eventName, handler) {
      socket.on(eventName, handler);
    },
    async emitWithAck(event, data, timeout = 5000) {
      return new Promise((resolve, reject) => {
        socket.emit(event, data, (response) => {
          if (response?.success === false) {
            reject(new Error(response.error?.message ?? 'WS request failed'));
          } else {
            resolve(response);
          }
        });
        setTimeout(
          () => reject(new Error(`Timeout waiting for ${event} ack`)),
          timeout,
        );
      });
    },
    async waitForEvent(eventName, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const existing = events.get(eventName);
        if (existing && existing.length > 0) {
          resolve(existing.shift());
          return;
        }
        const handler = (data: any) => {
          socket.off(eventName, handler);
          resolve(data);
        };
        socket.on(eventName, handler);
        setTimeout(() => {
          socket.off(eventName, handler);
          reject(new Error(`Timeout waiting for event ${eventName}`));
        }, timeout);
      });
    },
    async disconnect() {
      socket.disconnect();
      await new Promise((r) => setTimeout(r, 50));
    },
  };
}

/**
 * Wait for a socket to be connected.
 */
export async function waitForConnect(
  socket: Socket,
  timeout = 5000,
): Promise<void> {
  if (socket.connected) return;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Connection timeout')),
      timeout,
    );
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * HTTP request helper with auth.
 */
export async function httpRequest(
  baseUrl: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  accessToken: string,
  body?: any,
): Promise<{ status: number; data: any }> {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

/**
 * Assert that a WS response indicates success.
 */
export function expectWsSuccess(response: any): void {
  expect(response).toBeDefined();
  expect(response.success).toBe(true);
}

/**
 * Assert that a WS response indicates an error with a specific code.
 */
export function expectWsError(response: any, expectedCode?: number): void {
  expect(response).toBeDefined();
  expect(response.success).toBe(false);
  if (expectedCode) {
    expect(response.error?.code).toBe(expectedCode);
  }
}
