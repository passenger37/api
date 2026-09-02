/**
 * Lecture 40.98 — 1M-User Capacity Planning (B2 40.88).
 *
 * PHASE 59 "Create actual estimates for: registered users, daily active users,
 * concurrent users, messages/user/day, messages/sec, database storage, media
 * storage, Redis memory, network bandwidth. ... They must be established from
 * expected product usage rather than guessed."
 *
 * This module turns documented product-usage assumptions into the exact
 * estimates. Every assumption carries a `rationale` describing the expected
 * product usage it derives from, and every derived number is a pure function
 * of those assumptions — so a number is never plucked from the air. All knobs
 * are overridable per environment via `CAPACITY_*` env vars (mirroring the
 * `LOAD_*` knob style of the 40.80 load model).
 */

export const CAPACITY_ESTIMATES = [
  'registeredUsers',
  'dailyActiveUsers',
  'concurrentUsers',
  'messagesPerUserPerDay',
  'messagesPerSec',
  'databaseStorage',
  'mediaStorage',
  'redisMemory',
  'networkBandwidth',
] as const;

export type CapacityEstimateId = (typeof CAPACITY_ESTIMATES)[number];

export interface CapacityEstimate {
  id: CapacityEstimateId;
  label: string;
  value: number;
  unit: string;
  /** How the value was derived from the usage assumptions (never guessed). */
  derivedFrom: string;
}

export interface CapacityAssumption {
  field: string;
  label: string;
  value: number;
  unit: string;
  /** Expected-product-usage basis for the value. */
  rationale: string;
}

export const CAPACITY_ASSUMPTIONS: CapacityAssumption[] = [
  {
    field: 'registeredUsers',
    label: 'registered users',
    value: 1_000_000,
    unit: 'users',
    rationale:
      'Target scale of the platform: one million registered accounts (the load model registers the same 1M baseline).',
  },
  {
    field: 'dauRatio',
    label: 'DAU ratio',
    value: 0.2,
    unit: 'frac',
    rationale:
      'Expected product usage: ~20% of registered accounts are active on a given day — a mid-range engagement curve for a general-purpose chat/social product (not a daily-driver app like a work messenger).',
  },
  {
    field: 'concurrentRatio',
    label: 'peak concurrent / DAU',
    value: 0.2,
    unit: 'frac',
    rationale:
      'Expected usage curve: of the daily actives, ~20% are simultaneously online at the modelled peak; 200k DAU x 20% = 40k concurrent, matching the 40.80 load model concurrency assumption.',
  },
  {
    field: 'messagesPerUserPerDay',
    label: 'messages / user / day',
    value: 100,
    unit: 'msg/user/day',
    rationale:
      'Expected product usage: an active chat user sends (and receives) ~100 messages/day across servers and DMs — a messaging-centric engagement profile.',
  },
  {
    field: 'mediaRatioPerMessage',
    label: 'media uploads / message',
    value: 0.02,
    unit: 'frac',
    rationale:
      'Expected product usage: ~2% of messages carry a media attachment (images, voice/video clips, files); the rest are text-only.',
  },
  {
    field: 'avgMediaBytes',
    label: 'average media object size',
    value: 1_048_576,
    unit: 'bytes',
    rationale:
      'Expected upload blend: images (hundreds of KB) dominate and voice/video clips weigh more — a 1 MiB average preserves headroom across the blend.',
  },
  {
    field: 'messageRowBytes',
    label: 'DB row + indexes / message',
    value: 1_024,
    unit: 'bytes',
    rationale:
      'Expected schema cost: content, author, channel, timestamps, ordering/read-state keys and their B-tree index pages cost ~1 KiB per message row.',
  },
  {
    field: 'userRowBytes',
    label: 'DB row / user',
    value: 4_096,
    unit: 'bytes',
    rationale:
      'Expected schema cost: identity, profile, E2EE key metadata and auth rows plus index pages ~4 KiB per registered user.',
  },
  {
    field: 'membershipRowsPerUser',
    label: 'memberships / user',
    value: 30,
    unit: 'rows',
    rationale:
      'Expected product usage: the average active user belongs to ~30 servers (guild-like communities) each tracked as a membership row.',
  },
  {
    field: 'membershipRowBytes',
    label: 'DB row / membership',
    value: 512,
    unit: 'bytes',
    rationale:
      'Expected schema cost: server_id + user_id + role/read-state pointers with secondary indexes ~512 B per membership row.',
  },
  {
    field: 'messageRetentionYears',
    label: 'message retention',
    value: 3,
    unit: 'years',
    rationale:
      'Expected product policy: full message history is kept for 3 years (no rolling purge for regular messages).',
  },
  {
    field: 'mediaRetentionYears',
    label: 'media retention',
    value: 2,
    unit: 'years',
    rationale:
      'Expected product policy: uploaded attachments/voice clips are retained 2 years, after which old media is eligible for re-encoding/archive.',
  },
  {
    field: 'peakToAverageTraffic',
    label: 'peak / daily-average traffic',
    value: 5,
    unit: 'x',
    rationale:
      'Expected usage curve: the hot evening hour carries ~5x the daily-average load — a standard social-product hour-to-average multiplier.',
  },
  {
    field: 'avgMsgWireBytes',
    label: 'avg WS message wire size',
    value: 1_024,
    unit: 'bytes',
    rationale:
      'Expected product usage: each message fan-out over the socket carries the payload + envelope + metadata; ~1 KiB average over text/media-event messages.',
  },
  {
    field: 'fanoutReceiversPerMessage',
    label: 'avg fan-out receivers / message',
    value: 2,
    unit: 'receivers',
    rationale:
      'Expected product usage: DMs dominate volume (1-2 receivers); large-server broadcasts are rarer, so the average fan-out is ~2 sockets per message.',
  },
  {
    field: 'restOpsPerMessage',
    label: 'REST ops / message',
    value: 5,
    unit: 'ops',
    rationale:
      'Expected product usage: each message interacts with REST through history reads, typing/presence, search, read-state and profile lookups around it (~5 weighted ops/message, per the load-model operation mix).',
  },
  {
    field: 'avgResponseBytes',
    label: 'avg REST response size',
    value: 1_024,
    unit: 'bytes',
    rationale:
      'Expected API envelope: JSON responses with metadata average ~1 KiB including headers (cursor pages and search results push the tail up).',
  },
  {
    field: 'presenceBytesPerSocket',
    label: 'Redis presence bytes / socket',
    value: 1_024,
    unit: 'bytes',
    rationale:
      'Expected Redis footprint: presence/last-seen tuple, typing state, room membership bitmaps and TTL bookkeeping per live socket.',
  },
  {
    field: 'sessionBytesPerActiveUser',
    label: 'Redis session bytes / DAU',
    value: 1_024,
    unit: 'bytes',
    rationale:
      'Expected Redis footprint: auth/session token, rate-limit counter sets and deduplication keys per active user.',
  },
  {
    field: 'transientBytesPerActiveUser',
    label: 'Redis transient bytes / DAU',
    value: 256,
    unit: 'bytes',
    rationale:
      'Expected Redis footprint: short-lived counters (typing, read receipts skew, backpressure watermarks) per active user.',
  },
  {
    field: 'queueJobBytes',
    label: 'Redis queue bytes / queued job',
    value: 4_096,
    unit: 'bytes',
    rationale:
      'Expected BullMQ footprint: the outbox/media/search job payloads plus its metadata while inflight.',
  },
  {
    field: 'queueHorizonSec',
    label: 'queue in-flight horizon',
    value: 30,
    unit: 'sec',
    rationale:
      'Expected operation: workers drain a ~30-second horizon of queued work; the queue buffers roughly that window before consumption.',
  },
];

const envName = (field: string): string =>
  `CAPACITY_${field.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`;

export function capacityAssumptions(
  env: NodeJS.ProcessEnv = process.env,
): CapacityAssumption[] {
  return CAPACITY_ASSUMPTIONS.map((def) => {
    const raw = env[envName(def.field)];
    const parsed = Number(raw);
    const value =
      raw !== undefined && Number.isFinite(parsed) && parsed >= 0
        ? parsed
        : def.value;
    return { ...def, value };
  });
}

export function assumptionOf(
  assumptions: CapacityAssumption[],
  field: string,
): number {
  return assumptions.find((a) => a.field === field)?.value ?? 0;
}

export interface CapacityModel {
  modelVersion: string;
  assumptions: CapacityAssumption[];
  estimates: CapacityEstimate[];
  /** Secondary derived workload figures used by the estimate derivations. */
  workload: {
    dailyActiveUsers: number;
    concurrentUsers: number;
    dailyMessages: number;
    averageMessagesPerSec: number;
    peakMessagesPerSec: number;
    avgMsgWireBytes: number;
    peakToAverageTraffic: number;
  };
}

const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;

/**
 * Derive the nine B2 40.88 capacity estimates from the usage assumptions.
 * Every estimator is a direct formula over `assumptions` so the numbers are
 * exact and auditable — established from expected product usage, never guessed.
 */
export function buildCapacityModel(
  env: NodeJS.ProcessEnv = process.env,
): CapacityModel {
  const assumptions = capacityAssumptions(env);
  const A = (f: string): number => assumptionOf(assumptions, f);

  const registeredUsers = A('registeredUsers');
  const dauRatio = A('dauRatio');
  const concurrentRatio = A('concurrentRatio');
  const messagesPerUserPerDay = A('messagesPerUserPerDay');
  const mediaRatio = A('mediaRatioPerMessage');
  const avgMediaBytes = A('avgMediaBytes');
  const messageRowBytes = A('messageRowBytes');
  const userRowBytes = A('userRowBytes');
  const memberships = A('membershipRowsPerUser');
  const membershipBytes = A('membershipRowBytes');
  const msgRetention = A('messageRetentionYears');
  const mediaRetention = A('mediaRetentionYears');
  const peakFactor = A('peakToAverageTraffic');
  const wireBytes = A('avgMsgWireBytes');
  const fanout = A('fanoutReceiversPerMessage');
  const restOps = A('restOpsPerMessage');
  const responseBytes = A('avgResponseBytes');
  const presenceBytes = A('presenceBytesPerSocket');
  const sessionBytes = A('sessionBytesPerActiveUser');
  const transientBytes = A('transientBytesPerActiveUser');
  const jobBytes = A('queueJobBytes');
  const horizonSec = A('queueHorizonSec');

  const dailyActiveUsers = registeredUsers * dauRatio;
  const concurrentUsers = dailyActiveUsers * concurrentRatio;
  const dailyMessages = dailyActiveUsers * messagesPerUserPerDay;
  const averageMessagesPerSec = dailyMessages / SECONDS_PER_DAY;
  const peakMessagesPerSec = averageMessagesPerSec * peakFactor;

  const dailyMediaObjects = dailyMessages * mediaRatio;
  const dailyMediaBytes = dailyMediaObjects * avgMediaBytes;

  // database storage (bytes): message history + identities + memberships.
  const messageStore =
    dailyMessages * messageRowBytes * DAYS_PER_YEAR * msgRetention;
  const userStore = registeredUsers * userRowBytes;
  const membershipStore = registeredUsers * memberships * membershipBytes;
  const databaseStorage = messageStore + userStore + membershipStore;

  // media storage (bytes).
  const mediaStorage = dailyMediaBytes * DAYS_PER_YEAR * mediaRetention;

  // Redis memory (bytes): presence + sessions/rate-limit + transient + queues.
  const redisPresence = concurrentUsers * presenceBytes;
  const redisSessions = dailyActiveUsers * sessionBytes;
  const redisTransient = dailyActiveUsers * transientBytes;
  const redisQueues = peakMessagesPerSec * jobBytes * horizonSec;
  const redisMemory =
    redisPresence + redisSessions + redisTransient + redisQueues;

  // Network bandwidth at peak (bytes/sec -> Mbps).
  const wsBytesPerSec = peakMessagesPerSec * wireBytes * fanout;
  const mediaBytesPerSec = (dailyMediaBytes / SECONDS_PER_DAY) * peakFactor;
  const restBytesPerSec = peakMessagesPerSec * restOps * responseBytes;
  const networkBytesPerSec = wsBytesPerSec + mediaBytesPerSec + restBytesPerSec;
  const networkMbps = (networkBytesPerSec * 8) / 1_000_000;

  const round = (n: number, dp = 2): number => Number(n.toFixed(dp));

  const estimates: CapacityEstimate[] = [
    {
      id: 'registeredUsers',
      label: 'registered users',
      value: registeredUsers,
      unit: 'users',
      derivedFrom: `assumption registeredUsers = ${registeredUsers} (target scale)`,
    },
    {
      id: 'dailyActiveUsers',
      label: 'daily active users',
      value: round(dailyActiveUsers),
      unit: 'users',
      derivedFrom: `DAU = ${registeredUsers.toLocaleString()} registered x dauRatio ${dauRatio} = ${dailyActiveUsers.toLocaleString()} active/day`,
    },
    {
      id: 'concurrentUsers',
      label: 'concurrent users (peak)',
      value: round(concurrentUsers),
      unit: 'users',
      derivedFrom: `peak concurrent = DAU ${dailyActiveUsers.toLocaleString()} x concurrentRatio ${concurrentRatio} = ${concurrentUsers.toLocaleString()} sockets (matches 40.80 load model)`,
    },
    {
      id: 'messagesPerUserPerDay',
      label: 'messages / user / day',
      value: messagesPerUserPerDay,
      unit: 'msg/user/day',
      derivedFrom: `assumption messagesPerUserPerDay = ${messagesPerUserPerDay} (expected chat usage per active user)`,
    },
    {
      id: 'messagesPerSec',
      label: 'messages / sec (peak)',
      value: round(peakMessagesPerSec, 1),
      unit: 'msgs/s',
      derivedFrom: `daily messages = DAU ${dailyActiveUsers.toLocaleString()} x msgs/user/day ${messagesPerUserPerDay} = ${dailyMessages.toLocaleString()}; avg = /${SECONDS_PER_DAY}s = ${round(averageMessagesPerSec, 1)}; peak = avg x ${peakFactor} = ${round(peakMessagesPerSec, 1)}`,
    },
    {
      id: 'databaseStorage',
      label: 'database storage (3yr messages + identities + memberships)',
      value: round(databaseStorage / 1e12, 2),
      unit: 'TB',
      derivedFrom: `messages ${messageStore.toLocaleString()}B (${dailyMessages.toLocaleString()}/day x ${messageRowBytes}B x ${DAYS_PER_YEAR}d x ${msgRetention}y) + users ${userStore.toLocaleString()}B + memberships ${membershipStore.toLocaleString()}B (${registeredUsers.toLocaleString()} users x ${memberships} x ${membershipBytes}B)`,
    },
    {
      id: 'mediaStorage',
      label: 'media storage (2yr attachments)',
      value: round(mediaStorage / 1e12, 2),
      unit: 'TB',
      derivedFrom: `daily media ${dailyMediaObjects.toLocaleString()} objects = ${dailyMessages.toLocaleString()} msgs x mediaRatio ${mediaRatio}; avg ${avgMediaBytes}B x ${DAYS_PER_YEAR}d x ${mediaRetention}y`,
    },
    {
      id: 'redisMemory',
      label: 'Redis memory (hot store)',
      value: round(redisMemory / 1e6, 1),
      unit: 'MB',
      derivedFrom: `presence ${round(redisPresence / 1e6, 1)}MB (${concurrentUsers.toLocaleString()} sockets x ${presenceBytes}B) + sessions ${round(redisSessions / 1e6, 1)}MB + transient ${round(redisTransient / 1e6, 1)}MB + queues ${round(redisQueues / 1e6, 1)}MB (${round(peakMessagesPerSec, 1)} msgs/s x ${jobBytes}B x ${horizonSec}s)`,
    },
    {
      id: 'networkBandwidth',
      label: 'network bandwidth (peak)',
      value: round(networkMbps, 1),
      unit: 'Mbps',
      derivedFrom: `ws ${round(wsBytesPerSec / 1e6, 1)}MB/s (peak msgs/s ${round(peakMessagesPerSec, 1)} x ${wireBytes}B x fanout ${fanout}) + media ${round(mediaBytesPerSec / 1e6, 1)}MB/s + rest ${round(restBytesPerSec / 1e6, 1)}MB/s (x restOps ${restOps} x ${responseBytes}B) -> ${round(networkMbps, 1)} Mbps`,
    },
  ];

  return {
    modelVersion: '1.0.0',
    assumptions,
    estimates,
    workload: {
      dailyActiveUsers,
      concurrentUsers,
      dailyMessages,
      averageMessagesPerSec,
      peakMessagesPerSec,
      avgMsgWireBytes: wireBytes,
      peakToAverageTraffic: peakFactor,
    },
  };
}
