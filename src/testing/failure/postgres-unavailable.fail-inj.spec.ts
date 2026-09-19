/**
 * Lecture 40.90 - Failure Injection Testing: PostgreSQL unavailable.
 *
 * Proves the degradation contract when Postgres is unreachable. A real
 * `PrismaService` is pointed at a closed port - no live Postgres needed.
 *
 *  - Boot / queries fail fast with Prisma errors (P1001-family).
 *  - The global exception filter translates the outage into the stable HTTP
 *    500 `{ success:false }` envelope WITHOUT leaking Prisma internals.
 *  - Deliberate HttpExceptions still round-trip with their own status/message
 *    while the DB is down (the 4xx contract stays intact).
 *  - A unique-violation (P2002) that escapes idempotency recovery still
 *    degrades to the standard WS `INTERNAL_ERROR` frame.
 */
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { GlobalExceptionFilter } from '../../common/exceptions/filters/global-exception.filter';
import { StructuredLogger } from '../../core/logger/structured-logger';
import { PrismaService } from '../../core/database/prisma.service';
import { WebSocketErrorCode } from '../../common/websocket/error/websocket-error-code.enum';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';

const UNREACHABLE_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:1/nexus?connect_timeout=2';

describe('Failure Injection: PostgreSQL unavailable (40.90)', () => {
  let prisma: PrismaService;
  let bootError: unknown;

  beforeAll(async () => {
    prisma = new PrismaService({ datasourceUrl: UNREACHABLE_DB_URL });
    try {
      await prisma.$connect();
    } catch (error) {
      bootError = error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });

  it('fails fast with a Prisma error when Postgres is unreachable', () => {
    expect(bootError).toBeDefined();
    expect(bootError).toBeInstanceOf(Error);
  });

  it('runtime queries fail loud while Postgres is unavailable', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow();
  });

  it('translates a Postgres outage into the HTTP 500 frame without leaking internals', () => {
    const response: { status: jest.Mock; json: jest.Mock } = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      method: 'GET',
      url: '/servers/s/channels/c/messages',
      id: undefined,
      user: undefined,
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    const filter = new GlobalExceptionFilter({
      error: () => undefined,
    } as unknown as StructuredLogger);

    filter.catch(bootError ?? new Error('Postgres unavailable'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal Server Error',
      }),
    );
    // No Prisma error codes / engine details leak to the client.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/P1001|Prisma/g);
  });

  it('keeps the deliberate 4xx contract while the DB is down', () => {
    const response: { status: jest.Mock; json: jest.Mock } = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      method: 'GET',
      url: '/jobs/job-1',
      id: undefined,
      user: undefined,
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    const filter = new GlobalExceptionFilter({
      error: () => undefined,
    } as unknown as StructuredLogger);

    filter.catch(new NotFoundException('Job not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    const body = response.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 404 }),
    );
  });

  it('a P2002 that escapes dedup recovery degrades to the WS INTERNAL_ERROR frame', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`clientMessageId`,`authorMemberId`)',
      {
        code: 'P2002',
        clientVersion: Prisma.prismaVersion.client,
        meta: { target: ['clientMessageId', 'authorMemberId'] },
      },
    );
    expect(err.code).toBe('P2002');

    const frame = new WebSocketErrorNormalizer().normalize(err, 'send-message');
    expect(frame.success).toBe(false);
    expect(frame.error.code).toBe(WebSocketErrorCode.INTERNAL_ERROR);
  });
});
