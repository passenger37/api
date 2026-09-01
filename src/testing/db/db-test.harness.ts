import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../core/database/prisma.service';

/**
 * Opt-in Database Integration Test harness (Lecture 40.87).
 *
 * Connects to a real PostgreSQL rather than mocking the data layer. Each run
 * creates a throwaway, isolated schema, pushes the Prisma schema into it, and
 * hands back a `PrismaService` pointed at that schema. Teardown drops the
 * schema. This keeps the default unit suite (no DB) green in CI while allowing
 * true integration coverage against a live Postgres via `npm run test:db`.
 */

export interface DbTestHarnessOptions {
  /** Base connection string (no schema). Defaults to NEXUS_DB_TEST_URL, then DATABASE_URL. */
  url?: string;
  /** Absolute path to the Prisma schema file. */
  schemaPath?: string;
  /** Timeout (ms) for the schema push subprocess. */
  pushTimeoutMs?: number;
}

export interface DbTestContext {
  /** A live `PrismaService` connected to the isolated schema. */
  prisma: PrismaService;
  /** Base connection string (no schema parameter). */
  baseUrl: string;
  /** The throwaway schema name. */
  schemaName: string;
  /** Fully qualified schema-scoped connection string. */
  url: string;
  /** Drop the schema and disconnect. Safe to call repeatedly. */
  cleanup: () => Promise<void>;
}

const SCHEMA_PREFIX = 'nexus_db_int_';

function readDotEnvUrl(): string | undefined {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return undefined;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
  return match ? match[1].trim() : undefined;
}

export function resolveDbTestBaseUrl(explicit?: string): string {
  const url = explicit ?? process.env.NEXUS_DB_TEST_URL ?? process.env.DATABASE_URL ?? readDotEnvUrl();
  if (!url) {
    throw new Error(
      'Database Integration Tests require a PostgreSQL connection string. ' +
        'Set NEXUS_DB_TEST_URL (or DATABASE_URL) and run `npm run test:db`.',
    );
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(`NEXUS_DB_TEST_URL/DATABASE_URL must be a PostgreSQL URL (got: ${url.slice(0, 30)}...).`);
  }
  return url;
}

function randomSuffix(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function resolveSchemaPath(explicit?: string): string {
  if (explicit) {
    return path.resolve(explicit);
  }
  // src/testing/db -> ../../../prisma/schema.prisma
  return path.resolve(__dirname, '../../../prisma/schema.prisma');
}

function resolvePrismaCliJs(): string {
  // Resolves to <monorepo or package>/node_modules/.../prisma/build/index.js
  const pkg = require.resolve('prisma/package.json');
  return path.join(path.dirname(pkg), 'build', 'index.js');
}

function withSchema(url: string, schemaName: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}schema=${encodeURIComponent(schemaName)}`;
}

async function createSchema(baseUrl: string, schemaName: string): Promise<void> {
  const bootstrap = new PrismaService({ datasourceUrl: baseUrl });
  try {
    await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
  } finally {
    await bootstrap.$disconnect().catch(() => undefined);
  }
}

async function dropSchema(baseUrl: string, schemaName: string): Promise<void> {
  const bootstrap = new PrismaService({ datasourceUrl: baseUrl });
  try {
    await bootstrap.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await bootstrap.$disconnect().catch(() => undefined);
  }
}

function sleep(ms: number): void {
  const end = Date.now() + ms;
  // eslint-disable-next-line no-empty
  while (Date.now() < end) {}
}

function pushSchema(schemaPath: string, schemaScopedUrl: string, pushTimeoutMs: number): void {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-db-int-'));
  try {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: schemaScopedUrl,
      DIRECT_URL: undefined,
    };
    delete env.DIRECT_URL;

    execFileSync(
      process.execPath,
      [resolvePrismaCliJs(), 'db', 'push', '--skip-generate', '--schema', schemaPath],
      {
        cwd: tmpDir,
        env,
        stdio: 'pipe',
        timeout: pushTimeoutMs,
      },
    );
  } finally {
    // On Windows the PRISMA child can transiently hold the temp cwd. The temp
    // dir is throwaway; best-effort removal is enough.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        break;
      } catch {
        // EPERM / EBUSY — wait and retry
        sleep(100);
      }
    }
  }
}

export async function createDbTestHarness(
  options: DbTestHarnessOptions = {},
): Promise<DbTestContext> {
  const baseUrl = resolveDbTestBaseUrl(options.url);
  const schemaName = `${SCHEMA_PREFIX}${randomSuffix()}`;
  const schemaPath = resolveSchemaPath(options.schemaPath);
  const pushTimeoutMs = options.pushTimeoutMs ?? 120_000;

  await createSchema(baseUrl, schemaName);
  const url = withSchema(baseUrl, schemaName);

  let pushed = false;
  try {
    pushSchema(schemaPath, url, pushTimeoutMs);
    pushed = true;
  } catch (error) {
    await dropSchema(baseUrl, schemaName);
    throw new Error(
      `Failed to push Prisma schema into isolated DB schema "${schemaName}". ` +
        `Is a PostgreSQL reachable at NEXUS_DB_TEST_URL / DATABASE_URL? ${String(error)}`,
    );
  }

  if (!pushed) {
    throw new Error('unreachable');
  }

  const prisma = new PrismaService({ datasourceUrl: url });
  await prisma.$connect();

  let cleaned = false;
  const cleanup = async (): Promise<void> => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await prisma.$disconnect().catch(() => undefined);
    await dropSchema(baseUrl, schemaName);
  };

  return { prisma, baseUrl, schemaName, url, cleanup };
}

/**
 * Runs `operation(tx)` inside a database transaction and always rolls it back.
 * Use to assert that transactional work is atomic: throw inside `operation` to
 * prove nothing was committed.
 */
export async function withTransaction<T>(
  prisma: PrismaService,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(operation);
}
