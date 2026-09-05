/**
 * Lecture 40.80 — Scale, Performance, Testing, Production (1M-User Load Model).
 *
 * The authoritative workload model for demonstrating that the API can absorb a
 * platform with one million registered users. It is deliberately conservative
 * (assumes only a small fraction of users are simultaneously active — the
 * standard Discord/Slack-style concurrency curve), and every number is derived
 * from first principles so it can be tuned per environment via env vars.
 *
 * The model is split into five parts:
 *   - `users`: registered-user scale tiers and the concurrency curve.
 *   - `connectionLimits`: expected persistent socket / presence load.
 *   - `operations`: the per-request mix (weighted RPS for the REST API) and the
 *     p50/p99 latency SLOs used by the baseline evaluator.
 *   - `asyncJobs`: the background job mix (outbox, media pipeline, search) that
 *     must drain faster than it is produced (drain ratio > 1).
 *   - `db`: approximate steady-state read/write ratios used to sanity-check DB
 *     sizing in the derived targets.
 *
 * All duration SLOs are in milliseconds.
 */

export interface OperationModel {
  /** Short Stable identifier used as a metric label / route key. */
  name: string;
  /** Weight of this operation relative to the others (sums to 100). */
  weightPct: number;
  /** 50th percentile latency SLO in milliseconds. */
  p50Ms: number;
  /** 99th percentile latency SLO in milliseconds. */
  p99Ms: number;
  /** Max acceptable error rate (fraction, 0.0–1.0). */
  errorRateMax: number;
}

export interface AsyncJobModel {
  /** Job name (matches the `name` used when enqueuing). */
  job: string;
  /** Share of enqueued jobs that belong to this type (sums to 100). */
  weightPct: number;
  /** How quickly a worker must drain, relative to enqueue rate (> 1 to keep up). */
  drainRatioMin: number;
  /** p99 processing latency SLO in milliseconds. */
  p99Ms: number;
}

export interface DbPathModel {
  /** Short Stable identifier for a tabulated hot read path. */
  path: string;
  /** Share of this path's traffic that is a read (0..1). */
  readRatio: number;
  /** Share of this path's traffic that is a write (0..1, = 1 - readRatio). */
  writeRatio: number;
  /** Expected validity of a cached value in seconds (drives the cache TTL). */
  stabilitySec: number;
}

export interface ConnectionLimitModel {
  /** Max persistent (socket.io) connections the gateway should hold. */
  maxConcurrentSockets: number;
  /** Max concurrent authenticated REST requests in flight. */
  maxConcurrentRequests: number;
}

export interface LoadModelSpec {
  version: string;
  registeredUsers: number;
  /** Faction of registered users online at the modelled peak. */
  concurrentRatio: number;
  /** Estimated peak concurrent active users. */
  peakConcurrentUsers: number;
  /** Average actions per active user per minute (message + read + presence). */
  actionsPerUserPerMin: number;
  /** Total operations per minute at peak = peakUsers x actionsPerUserPerMin. */
  peakOpsPerMin: number;
  peakOpsPerSec: number;
  connections: ConnectionLimitModel;
  operations: OperationModel[];
  asyncJobs: AsyncJobModel[];
  /**
   * Per hot read-path read/write split + value stability. This is the
   * load-model input the 40.83 cache architecture uses to decide WHAT to cache
   * ("do not cache everything"): cache stable, read-heavy paths; skip
   * write-heavy or volatile ones.
   */
  db: DbPathModel[];
}

export const LOAD_MODEL: LoadModelSpec = {
  version: '1.0.0',
  registeredUsers: 1_000_000,
  // ~4% concurrency curve — typical for a general-purpose chat/social platform.
  concurrentRatio: 0.04,
  get peakConcurrentUsers(): number {
    return Math.round(this.registeredUsers * this.concurrentRatio);
  },
  // 40k concurrent users, ~20 lightweight actions/min each => 800k ops/min.
  actionsPerUserPerMin: 20,
  get peakOpsPerMin(): number {
    return this.peakConcurrentUsers * this.actionsPerUserPerMin;
  },
  get peakOpsPerSec(): number {
    return Math.round(this.peakOpsPerMin / 60);
  },
  connections: {
    maxConcurrentSockets: 40_000,
    maxConcurrentRequests: 5_000,
  },
  // REST message-domain mix (weights sum to 100). These mirror the endpoints in
  // the messaging / dm / search / media / social modules.
  operations: [
    { name: 'message.create', weightPct: 15, p50Ms: 150, p99Ms: 500, errorRateMax: 0.01 },
    { name: 'message.history', weightPct: 20, p50Ms: 100, p99Ms: 400, errorRateMax: 0.01 },
    { name: 'dm.open', weightPct: 6, p50Ms: 120, p99Ms: 450, errorRateMax: 0.01 },
    { name: 'dm.send', weightPct: 8, p50Ms: 180, p99Ms: 550, errorRateMax: 0.01 },
    { name: 'channel.typing', weightPct: 12, p50Ms: 60, p99Ms: 300, errorRateMax: 0.02 },
    { name: 'presence', weightPct: 8, p50Ms: 80, p99Ms: 350, errorRateMax: 0.02 },
    { name: 'search.query', weightPct: 4, p50Ms: 250, p99Ms: 900, errorRateMax: 0.01 },
    { name: 'attachment.upload', weightPct: 3, p50Ms: 400, p99Ms: 2000, errorRateMax: 0.01 },
    { name: 'server.list', weightPct: 3, p50Ms: 120, p99Ms: 450, errorRateMax: 0.01 },
    { name: 'call.create', weightPct: 2, p50Ms: 200, p99Ms: 800, errorRateMax: 0.01 },
    { name: 'call.ring', weightPct: 3, p50Ms: 100, p99Ms: 400, errorRateMax: 0.02 },
    { name: 'call.accept', weightPct: 2, p50Ms: 150, p99Ms: 500, errorRateMax: 0.01 },
    { name: 'call.end', weightPct: 1, p50Ms: 100, p99Ms: 300, errorRateMax: 0.01 },
    { name: 'call.signal', weightPct: 13, p50Ms: 50, p99Ms: 200, errorRateMax: 0.02 },
  ],
  // Background job mix fed by the outbox + media pipeline + search indexing
  // (weights sum to 100). Workers must drain faster than they are produced.
  asyncJobs: [
    { job: 'outbox', weightPct: 50, drainRatioMin: 1.5, p99Ms: 2000 },
    { job: 'media', weightPct: 30, drainRatioMin: 1.2, p99Ms: 5000 },
    { job: 'search', weightPct: 20, drainRatioMin: 1.5, p99Ms: 3000 },
  ],
  // Per hot read-path read/write split + value stability. Drives the 40.83
  // cache architecture's "what to cache" decision (read-heavy + stable =
  // cacheable; write-heavy or volatile = not cached).
  db: [
    { path: 'message.history', readRatio: 0.98, writeRatio: 0.02, stabilitySec: 10 },
    { path: 'dm.open', readRatio: 0.95, writeRatio: 0.05, stabilitySec: 60 },
    { path: 'server.list', readRatio: 0.99, writeRatio: 0.01, stabilitySec: 300 },
    { path: 'server.channel', readRatio: 0.98, writeRatio: 0.02, stabilitySec: 300 },
    { path: 'server.members', readRatio: 0.95, writeRatio: 0.05, stabilitySec: 60 },
    { path: 'channel.readstate', readRatio: 0.7, writeRatio: 0.3, stabilitySec: 10 },
    { path: 'search.query', readRatio: 1.0, writeRatio: 0.0, stabilitySec: 60 },
    { path: 'message.create', readRatio: 0.0, writeRatio: 1.0, stabilitySec: 0 },
    { path: 'dm.send', readRatio: 0.0, writeRatio: 1.0, stabilitySec: 0 },
  ],
};

/** Compute the model, honouring env overrides for the driving scale knobs. */
export function loadModel(env: NodeJS.ProcessEnv = process.env): LoadModelSpec {
  const users = Number(env.LOAD_USERS ?? LOAD_MODEL.registeredUsers);
  const ratio = Number(env.LOAD_CONCURRENCY_RATIO ?? LOAD_MODEL.concurrentRatio);
  const actions = Number(
    env.LOAD_ACTIONS_PER_USER_MIN ?? LOAD_MODEL.actionsPerUserPerMin,
  );
  const peak = Math.round(users * ratio);
  const opsPerMin = peak * actions;
  const opsPerSec = Math.round(opsPerMin / 60);

  return {
    ...LOAD_MODEL,
    version: LOAD_MODEL.version,
    registeredUsers: users,
    concurrentRatio: ratio,
    actionsPerUserPerMin: actions,
    peakConcurrentUsers: peak,
    peakOpsPerMin: opsPerMin,
    peakOpsPerSec: opsPerSec,
    connections: {
      maxConcurrentSockets: Number(
        env.LOAD_MAX_SOCKETS ?? LOAD_MODEL.connections.maxConcurrentSockets,
      ),
      maxConcurrentRequests: Number(
        env.LOAD_MAX_REQUESTS ?? LOAD_MODEL.connections.maxConcurrentRequests,
      ),
    },
    operations: LOAD_MODEL.operations.map((op) => ({
      ...op,
      p50Ms: op.p50Ms,
      p99Ms: op.p99Ms,
      errorRateMax: op.errorRateMax,
    })),
    asyncJobs: LOAD_MODEL.asyncJobs.map((job) => ({ ...job })),
  };
}
