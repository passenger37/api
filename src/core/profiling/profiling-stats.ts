import {
  AreaAssessment,
  AssessmentStatus,
  DeltaRow,
  DeltaReport,
  ProfileAreaId,
  SessionProfile,
} from './profiling.types';

/**
 * Lecture 40.97 — pure statistics / assessment helpers. Kept free of Nest and
 * I/O so the evaluator logic is unit-testable with fabricated samples; the
 * live samplers (profiling-samplers) feed real numbers into these functions.
 *
 * Direction rule: higher values are worse for every area (percentage CPU,
 * megabytes RSS, milliseconds latency). Delta is reported on p95.
 */

export function percentile(sortedAsc: number[], pct: number): number {
  if (sortedAsc.length === 0) return NaN;
  const rank = Math.max(1, Math.ceil((pct / 100) * sortedAsc.length));
  return sortedAsc[Math.min(sortedAsc.length - 1, rank - 1)];
}

export interface SampleSummary {
  count: number;
  min: number | null;
  p50: number | null;
  p95: number | null;
  max: number | null;
}

export function summarize(values: number[]): SampleSummary {
  if (values.length === 0) {
    return { count: 0, min: null, p50: null, p95: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

/** Warning zone: p95 within 80% of budget (approaching degradation). */
const WARNING_RATIO = 0.8;

export function assessArea(
  area: ProfileAreaId,
  unit: string,
  budget: number,
  values: number[],
  error?: string,
): AreaAssessment {
  if (error) {
    return {
      area,
      unit,
      budget,
      count: 0,
      min: null,
      p50: null,
      p95: null,
      max: null,
      status: 'unavailable',
      note: error,
    };
  }
  if (values.length === 0) {
    return {
      area,
      unit,
      budget,
      count: 0,
      min: null,
      p50: null,
      p95: null,
      max: null,
      status: 'unavailable',
      note: `No ${area} samples collected`,
    };
  }

  const summary = summarize(values);
  const p95 = summary.p95 ?? 0;
  const status: AssessmentStatus =
    p95 > budget ? 'degraded' : p95 > budget * WARNING_RATIO ? 'warning' : 'ok';

  return {
    area,
    unit,
    budget,
    ...summary,
    status,
    note: `p95 ${p95.toFixed(1)} ${unit} (budget ${budget} ${unit})`,
  };
}

export function evaluateOverall(areas: AreaAssessment[]): AssessmentStatus {
  if (areas.some((a) => a.status === 'degraded')) return 'degraded';
  if (areas.some((a) => a.status === 'warning')) return 'warning';
  return 'ok';
}

export function computeDeltaRows(
  baseline: SessionProfile,
  current: SessionProfile,
): DeltaRow[] {
  const byArea = (s: SessionProfile) =>
    new Map(s.areas.map((a) => [a.area, a]));
  const prev = byArea(baseline);
  const rows: DeltaRow[] = [];

  for (const area of current.areas) {
    const cur = area;
    const prevArea = prev.get(area.area);

    if (!prevArea || prevArea.p95 === null) {
      rows.push({
        area: area.area,
        unit: area.unit,
        budget: area.budget,
        baselineStatus: prevArea?.status ?? 'unavailable',
        currentStatus: cur.status,
        baselineP95: prevArea?.p95 ?? null,
        currentP95: cur.p95,
        changePct: null,
        verdict: 'new',
      });
      continue;
    }
    if (cur.p95 === null) {
      rows.push({
        area: area.area,
        unit: area.unit,
        budget: area.budget,
        baselineStatus: prevArea.status,
        currentStatus: cur.status,
        baselineP95: prevArea.p95,
        currentP95: null,
        changePct: null,
        verdict: 'unavailable',
      });
      continue;
    }

    const changePct =
      prevArea.p95 === 0
        ? cur.p95 === 0
          ? 0
          : 100
        : ((cur.p95 - prevArea.p95) / prevArea.p95) * 100;

    const verdict: DeltaRow['verdict'] =
      changePct <= -10
        ? 'improved'
        : changePct >= 10
          ? 'degraded'
          : 'unchanged';

    rows.push({
      area: area.area,
      unit: area.unit,
      budget: area.budget,
      baselineStatus: prevArea.status,
      currentStatus: cur.status,
      baselineP95: prevArea.p95,
      currentP95: cur.p95,
      changePct: Number(changePct.toFixed(1)),
      verdict,
    });
  }
  return rows;
}

export function buildDeltaReport(
  baseline: SessionProfile | null,
  current: SessionProfile | null,
): DeltaReport {
  if (!baseline || !current) {
    return {
      baselineId: baseline?.id ?? null,
      currentId: current?.id ?? null,
      rows: [],
    };
  }
  return {
    baselineId: baseline.id,
    currentId: current.id,
    rows: computeDeltaRows(baseline, current),
  };
}
