/**
 * Lecture 40.82 — Load-model-driven DB/query optimisation.
 *
 * The hot query-path registry. Each entry models a real, frequently-executed
 * database access path of the API and the candidate index strategies available
 * for it. This registry is deliberately grounded in the actual schema + the
 * additive raw-SQL index migrations we ship:
 *
 *   - `outbox.pending`     -> OutboxEvent partial index (40.56) + (status, createdAt)
 *   - `channel.history`    -> ChannelMessage (channelId, createdAt, id)
 *   - `channel.bySeq`      -> ChannelMessage (channelId, messageSeq)
 *   - `server.members`     -> ServerMember active partial index (40.56)
 *   - `dm.read`            -> DM read-state / event lookup
 *   - `e2ee.delivery`      -> E2eeDeliveryQueue + E2eeEnvelope partial pickup (40.82)
 *   - `job.ready`          -> BackgroundJob ready pickup partial index (40.82)
 *   - `outbox.event`       -> OutboxEvent publisher ordering
 *
 * The ROW estimates and access coefficients defined below are conservative and
 * tunable via env, and are *driven* by the 40.80 load model (peak ops/sec)
 * rather than hard-coded absolute numbers.
 */

export type IndexStrategy =
  | 'partial' // partial index confines the hot (outstanding) subset
  | 'covering' // index-only scan: columns cover the read
  | 'composite' // leading equality + ordering columns
  | 'seq'; // bare table scan (no beneficial index)

export interface AccessPath {
  /** Stable identifier of this access path. */
  id: string;
  /** Index strategy this path uses. */
  strategy: IndexStrategy;
  /**
   * Rows scanned per request, expressed as a *fraction of the path's average
   * wait-set rows*. A lowers value means a more selective access path.
   */
  selectivity: number;
  /** Env knob prefix used to tune each coefficient (see load with env). */
  envKey: string;
}

export interface QueryPath {
  /** Stable identifier, e.g. `outbox.pending`. */
  name: string;
  /** The table / access pattern this path models. */
  description: string;
  /**
   * Modelled rows scanned for one request at unit load. The service scales
   * this by the per-path wait-set multiplier (users/channels/jobs) derived
   * from the load model.
   */
  baseRows: number;
  /**
   * Fan-out multiplier of the wait set (active channels, member lists, queued
   * jobs) derived from the load model, applied to `baseRows`.
   */
  waitSetScale: number;
  /** Cache of candidate access paths; `accessPaths[0]` is the baseline. */
  accessPaths: AccessPath[];
}

export const QUERY_PATHS: QueryPath[] = [
  {
    name: 'outbox.pending',
    description:
      'OutboxPublisherService poll for PENDING events (partial index).',
    baseRows: 1_000_000,
    waitSetScale: 0.02,
    accessPaths: [
      {
        id: 'full-scan',
        strategy: 'seq',
        selectivity: 0.5,
        envKey: 'QP_OUTBOX_FULL',
      },
      {
        id: 'status-scan',
        strategy: 'composite',
        selectivity: 0.1,
        envKey: 'QP_OUTBOX_STATUS',
      },
      {
        id: 'pick-100',
        strategy: 'partial',
        selectivity: 0.0002,
        envKey: 'QP_OUTBOX_PICK',
      },
    ],
  },
  {
    name: 'channel.history',
    description: 'Cursor pagination of ChannelMessage history.',
    baseRows: 5_000_000,
    waitSetScale: 0.01,
    accessPaths: [
      {
        id: 'channel-scan',
        strategy: 'composite',
        selectivity: 0.05,
        envKey: 'QP_CHAN_FULL',
      },
      {
        id: 'chan-created-id',
        strategy: 'covering',
        selectivity: 0.002,
        envKey: 'QP_CHAN_CID',
      },
    ],
  },
  {
    name: 'channel.bySeq',
    description: 'Sequence-ordered lookup (idempotency / replay).',
    baseRows: 5_000_000,
    waitSetScale: 0.02,
    accessPaths: [
      {
        id: 'channel-seq-scan',
        strategy: 'composite',
        selectivity: 0.01,
        envKey: 'QP_SEQ_SCAN',
      },
      {
        id: 'chan-seq',
        strategy: 'covering',
        selectivity: 0.0004,
        envKey: 'QP_SEQ_LOOKUP',
      },
    ],
  },
  {
    name: 'server.members',
    description: 'Active member listing/count for a server (partial index).',
    baseRows: 2_000_000,
    waitSetScale: 0.05,
    accessPaths: [
      {
        id: 'all-members',
        strategy: 'composite',
        selectivity: 0.2,
        envKey: 'QP_MEM_ALL',
      },
      {
        id: 'active-members',
        strategy: 'partial',
        selectivity: 0.02,
        envKey: 'QP_MEM_ACTIVE',
      },
    ],
  },
  {
    name: 'dm.read',
    description: 'DM thread read-state / unread lookup.',
    baseRows: 500_000,
    waitSetScale: 0.1,
    accessPaths: [
      {
        id: 'dm-user-scan',
        strategy: 'composite',
        selectivity: 0.1,
        envKey: 'QP_DM_SCAN',
      },
      {
        id: 'dm-peer',
        strategy: 'covering',
        selectivity: 0.001,
        envKey: 'QP_DM_PEER',
      },
    ],
  },
  {
    name: 'e2ee.delivery',
    description:
      'E2EE envelope + delivery-queue pending pickup (partial index, 40.82).',
    baseRows: 3_000_000,
    waitSetScale: 0.01,
    accessPaths: [
      {
        id: 'delivery-table-scan',
        strategy: 'seq',
        selectivity: 0.4,
        envKey: 'QP_E2EE_FULL',
      },
      {
        id: 'delivery-status',
        strategy: 'composite',
        selectivity: 0.15,
        envKey: 'QP_E2EE_STATUS',
      },
      {
        id: 'pick-batch',
        strategy: 'partial',
        selectivity: 0.0003,
        envKey: 'QP_E2EE_PICK',
      },
    ],
  },
  {
    name: 'job.ready',
    description: 'BackgroundJob ready-to-run pickup (partial index, 40.82).',
    baseRows: 1_000_000,
    waitSetScale: 0.05,
    accessPaths: [
      {
        id: 'job-table-scan',
        strategy: 'seq',
        selectivity: 0.5,
        envKey: 'QP_JOB_FULL',
      },
      {
        id: 'job-queue-status',
        strategy: 'composite',
        selectivity: 0.05,
        envKey: 'QP_JOB_STATUS',
      },
      {
        id: 'pick-ready',
        strategy: 'partial',
        selectivity: 0.0005,
        envKey: 'QP_JOB_READY',
      },
    ],
  },
];

/** Load the path registry honouring per-access-path env overrides. */
export function loadQueryPaths(
  env: NodeJS.ProcessEnv = process.env,
): QueryPath[] {
  return QUERY_PATHS.map((path) => ({
    ...path,
    accessPaths: path.accessPaths.map((ap) => {
      const raw = env[ap.envKey];
      const selectivity = raw ? Number(raw) : ap.selectivity;
      return { ...ap, selectivity };
    }),
  }));
}
