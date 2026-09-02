import { io } from 'socket.io-client';
import { Prisma } from '@prisma/client';

/**
 * Lecture 40.97 — live probes for the profiling study list (CPU, memory,
 * event-loop latency, PostgreSQL, Redis, network, WebSocket throughput).
 *
 * Each probe returns raw samples (ms / % / mb) and is kept a thin standalone
 * function so the orchestrating service can substitute fakes in tests and
 * degrade an area to "unavailable" when its infrastructure is absent.
 */

export interface ProbeResult {
  values: number[];
  /** Optional secondary observations surfaced in the area note. */
  extra?: Record<string, string | number>;
}

export interface PostgresProbe {
  $queryRaw(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ): Promise<unknown>;
}

export interface RedisProbeClient {
  ping(): Promise<unknown>;
}

export interface RedisProbe {
  getClient(): RedisProbeClient;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Event-loop latency: drift of a `setTimeout(delay)` against wall time. */
export async function sampleEventLoopLag(opts: {
  samples?: number;
  delayMs?: number;
  sleepImpl?: (ms: number) => Promise<void>;
}): Promise<ProbeResult> {
  const samples = opts.samples ?? 20;
  const delayMs = opts.delayMs ?? 10;
  const wait = opts.sleepImpl ?? sleep;
  const values: number[] = [];
  for (let i = 0; i < samples; i++) {
    const started = process.hrtime.bigint();
    await wait(delayMs + i); // staggered delay avoids lockstep sampling
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    values.push(Math.max(0, elapsedMs - (delayMs + i)));
  }
  return { values };
}

/** CPU utilisation: process.cpuUsage() delta over a window, normalised per core. */
export async function sampleProcessCpu(opts: {
  samples?: number;
  windowMs?: number;
  sleepImpl?: (ms: number) => Promise<void>;
  osCpus?: { length: number };
}): Promise<ProbeResult> {
  const samples = opts.samples ?? 3;
  const windowMs = opts.windowMs ?? 250;
  const wait = opts.sleepImpl ?? sleep;
  const cpuCount = opts.osCpus?.length ?? 1;
  const values: number[] = [];
  for (let i = 0; i < samples; i++) {
    const before = process.cpuUsage();
    await wait(windowMs + i);
    const delta = process.cpuUsage(before);
    const usedMs = (delta.user + delta.system) / 1000;
    values.push((usedMs / (windowMs + i) / cpuCount) * 100);
  }
  return { values };
}

/** Memory: resident set size in MB. */
export async function sampleMemory(opts: {
  samples?: number;
  sleepImpl?: (ms: number) => Promise<void>;
}): Promise<ProbeResult> {
  const samples = opts.samples ?? 3;
  const wait = opts.sleepImpl ?? sleep;
  const values: number[] = [];
  for (let i = 0; i < samples; i++) {
    values.push(process.memoryUsage().rss / (1024 * 1024));
    if (i < samples - 1) await wait(20);
  }
  return { values };
}

/** PostgreSQL round trip: `SELECT 1` through the injected Prisma client. */
export async function samplePostgresPing(opts: {
  prisma: PostgresProbe;
  samples?: number;
}): Promise<ProbeResult> {
  const samples = opts.samples ?? 3;
  const values: number[] = [];
  for (let i = 0; i < samples; i++) {
    const started = process.hrtime.bigint();
    await opts.prisma.$queryRaw(Prisma.sql`SELECT 1`);
    values.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  return { values };
}

/** Redis round trip: PING through the injected client. */
export async function sampleRedisPing(opts: {
  redis: RedisProbe;
  samples?: number;
}): Promise<ProbeResult> {
  const samples = opts.samples ?? 3;
  const values: number[] = [];
  const client = opts.redis.getClient();
  for (let i = 0; i < samples; i++) {
    const started = process.hrtime.bigint();
    await client.ping();
    values.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  return { values };
}

/** Network / REST round trip: a local fetch through the app's HTTP stack. */
export async function sampleHttpRoundTrip(opts: {
  baseUrl: string;
  path?: string;
  samples?: number;
  fetchImpl?: typeof fetch;
}): Promise<ProbeResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const samples = opts.samples ?? 5;
  const url = `${opts.baseUrl.replace(/\/$/, '')}${opts.path ?? '/metrics'}`;
  const values: number[] = [];
  for (let i = 0; i < samples; i++) {
    const started = process.hrtime.bigint();
    const res = await fetchImpl(url);
    await res.text();
    if (!res.ok) throw new Error(`network probe HTTP ${res.status}`);
    values.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  return { values };
}

export interface WebSocketProbeOptions {
  baseUrl: string;
  namespace?: string;
  messages?: number;
  ackTimeoutMs?: number;
  connectTimeoutMs?: number;
}

/** WebSocket round trips: self-connect to the /profiling probe namespace. */
export async function sampleWebSocketRoundTrips(
  opts: WebSocketProbeOptions,
): Promise<ProbeResult> {
  const { baseUrl, namespace = 'profiling' } = opts;
  const connectTimeoutMs = opts.connectTimeoutMs ?? 3000;
  const ackTimeoutMs = opts.ackTimeoutMs ?? 2000;
  const messages = opts.messages ?? 60;

  const socket = io(`${baseUrl.replace(/\/$/, '')}/${namespace}`, {
    transports: ['websocket'],
    timeout: connectTimeoutMs,
  });
  try {
    const connectedAt = process.hrtime.bigint();
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', (err: Error) => reject(err));
      socket.once('error', (err: Error) => reject(err));
    });
    const connectMs = Number(process.hrtime.bigint() - connectedAt) / 1e6;

    const values: number[] = [];
    const started = process.hrtime.bigint();
    for (let i = 0; i < messages; i++) {
      const t0 = process.hrtime.bigint();
      await socket.timeout(ackTimeoutMs).emitWithAck('probe:ping', i);
      values.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    const totalMs = Number(process.hrtime.bigint() - started) / 1e6;
    return {
      values,
      extra: {
        connectMs,
        'msg/s': totalMs > 0 ? (messages / totalMs) * 1000 : 0,
        connectDelayMs: connectMs,
      },
    };
  } finally {
    socket.disconnect();
  }
}
