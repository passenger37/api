import { ProfileAreaId, PROFILE_AREAS } from './profiling.types';

/**
 * Lecture 40.97 — reference budgets for the profiling session evaluator.
 *
 * Latency budgets are expressed on the p95 of the sampled distribution (the
 * B2 40.87 study cares about the tail, not the average). Defaults are
 * infrastructure-independent reference values aligned with the load model's
 * p99 SLOs (40.80) and are overridable per environment via `PROFILE_<AREA>`.
 */

export interface ProfileBudget {
  area: ProfileAreaId;
  unit: string;
  /** Reference budget the p95 is compared against. */
  budget: number;
  /** Max accepted request samples before degradation vs budget. */
  samples: number;
}

const DEFAULTS: Record<ProfileAreaId, number> = {
  cpu: 80,
  memory: 1024,
  'event-loop': 30,
  postgres: 50,
  redis: 5,
  network: 50,
  websocket: 100,
};

export const DEFAULT_SAMPLE_COUNT = 20;
export const WS_PROBE_MESSAGES = 120;
export const DEFAULT_WS_THROTTLE_SLO = 500;
export const SESSION_RING_CAP = 20;
export const PROFILING_DATA_DIR = 'data/profiling';
export const PROFILING_DATA_FILE = 'sessions.jsonl';

function envBudget(
  env: NodeJS.ProcessEnv,
  area: ProfileAreaId,
  fallback: number,
): number {
  const raw =
    env[`PROFILE_${area.toUpperCase().replace('-', '_')}_BUDGET`] ??
    env.PROFILE_BUDGET_OVERRIDE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function profilingBudgets(
  env: NodeJS.ProcessEnv = process.env,
): ProfileBudget[] {
  return PROFILE_AREAS.map((area) => ({
    area,
    unit: unitFor(area),
    budget: envBudget(env, area, DEFAULTS[area]),
    samples: Number(env.PROFILE_SAMPLES ?? DEFAULT_SAMPLE_COUNT),
  }));
}

export function unitFor(area: ProfileAreaId): string {
  switch (area) {
    case 'cpu':
      return '%';
    case 'memory':
      return 'mb';
    default:
      return 'ms';
  }
}

export function budgetFor(
  budgets: ProfileBudget[],
  area: ProfileAreaId,
): number {
  return budgets.find((b) => b.area === area)?.budget ?? DEFAULTS[area];
}

export function sampleCountFor(env: NodeJS.ProcessEnv): number {
  return Number(env.PROFILE_SAMPLES ?? DEFAULT_SAMPLE_COUNT);
}

export function wsProbeMessages(env: NodeJS.ProcessEnv): number {
  return Number(env.PROFILE_WS_MESSAGES ?? WS_PROBE_MESSAGES);
}
