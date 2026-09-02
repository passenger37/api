/**
 * Lecture 40.97 — Performance Profiling types. The B2 40.87 spec studies CPU,
 * memory, event-loop latency, PostgreSQL, Redis, network, and WebSocket
 * throughput — "measure before optimizing". A profiling session captures a
 * per-area sample distribution, evaluates each against a reference budget, and
 * records the aggregate so later sessions can report deltas against baseline.
 */

export const PROFILE_AREAS = [
  'cpu',
  'memory',
  'event-loop',
  'postgres',
  'redis',
  'network',
  'websocket',
] as const;

export type ProfileAreaId = (typeof PROFILE_AREAS)[number];

export const PROFILE_UNITS = {
  cpu: '%',
  memory: 'mb',
  'event-loop': 'ms',
  postgres: 'ms',
  redis: 'ms',
  network: 'ms',
  websocket: 'ms',
} as const satisfies Record<ProfileAreaId, string>;

export type AssessmentStatus = 'ok' | 'warning' | 'degraded' | 'unavailable';

export interface AreaAssessment {
  area: ProfileAreaId;
  unit: string;
  /** Reference budget the p95 is compared against (unit-dependent). */
  budget: number;
  count: number;
  min: number | null;
  p50: number | null;
  p95: number | null;
  max: number | null;
  status: AssessmentStatus;
  /** Human summary, e.g. "p95 12.1 ms of 30 ms budget" or an error note. */
  note: string;
}

export interface RouteLatencyRow {
  method: string;
  route: string;
  requests: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
}

export interface SessionProfile {
  id: string;
  startedAt: string;
  finishedAt: string;
  instanceId: string;
  sampleCount: number;
  areas: AreaAssessment[];
  routes: RouteLatencyRow[];
  overall: AssessmentStatus;
}

export interface DeltaRow {
  area: ProfileAreaId;
  unit: string;
  budget: number;
  baselineStatus: AssessmentStatus;
  currentStatus: AssessmentStatus;
  baselineP95: number | null;
  currentP95: number | null;
  /** Positive = worse (higher latency/resource use); null when not comparable. */
  changePct: number | null;
  verdict: 'improved' | 'unchanged' | 'degraded' | 'new' | 'unavailable';
}

export interface DeltaReport {
  baselineId: string | null;
  currentId: string | null;
  rows: DeltaRow[];
}
