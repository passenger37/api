/**
 * Lecture 40.82 — Load-model-driven DB/query optimisation.
 *
 * The QueryOptimizerService is *driven by the 40.80 load model*: it reads the
 * derived per-operation throughput + latency SLO targets and, for each hot
 * query path in the registry, selects the cheapest access path (index
 * strategy) that stays within the modelled SLO budget at peak load. It then
 * reports the pre->post optimisation improvement (projected rows scanned per
 * second) so operators can confirm — via `/load-model/optimiser` and the
 * baseline runner — that each 40.82+ tuning step actually reduced work versus
 * the 40.80 baseline.
 *
 * All numbers are deterministic projections (no DB dependency) so the logic is
 * fully unit-testable; the raw-SQL partial indexes the 'partial' strategies
 * rely on ship alongside (`add_query_index_strategy_phase3`).
 */

import { Injectable } from '@nestjs/common';
import { LoadModelService } from '../../load-model/load-model.service';
import { loadModel } from '../../load-model/load-model.config';
import {
  AccessPath,
  QueryPath,
  loadQueryPaths,
} from './db-query-path';

export interface OptimisedPathPlan {
  name: string;
  description: string;
  /** Request count per second for this path at the modelled peak. */
  rps: number;
  /** Per-request latency budget from the representative SLO (ms). */
  sloMs: number;
  baseline: {
    strategy: IndexStrategyLabel;
    rowsPerRequest: number;
    rowsPerSec: number;
  };
  chosen: {
    strategy: IndexStrategyLabel;
    rowsPerRequest: number;
    rowsPerSec: number;
    withinSlo: boolean;
  };
  /** Projected reduction in rows scanned per second, 0..1. */
  reduction: number;
}

type IndexStrategyLabel = AccessPath['strategy'];

export interface OptimiserReport {
  modelVersion: string;
  peakOpsPerSec: number;
  paths: OptimisedPathPlan[];
  totals: {
    baselineRowsPerSec: number;
    optimisedRowsPerSec: number;
    reduction: number;
    allWithinSlo: boolean;
  };
  /** True when at least one path improved vs the 40.80-style baseline. */
  improved: boolean;
}

@Injectable()
export class DbQueryOptimizerService {
  constructor(private readonly loadModel: LoadModelService) {}

  /** Select the cheapest valid plan for every registered hot query path. */
  optimise(env: NodeJS.ProcessEnv = process.env): OptimiserReport {
    const paths = loadQueryPaths(env);
    const model = loadModel(env);
    const rps = this.derivedRps(paths, env);
    const sloMs = this.representativeSloMs(env);

    const plans: OptimisedPathPlan[] = paths.map((path) =>
      this.planForPath(path, rps, sloMs),
    );

    const baselineRowsPerSec = sum(plans, (p) => p.baseline.rowsPerSec);
    const optimisedRowsPerSec = sum(plans, (p) => p.chosen.rowsPerSec);
    const reduction =
      baselineRowsPerSec > 0
        ? Number(
            ((baselineRowsPerSec - optimisedRowsPerSec) / baselineRowsPerSec).toFixed(4),
          )
        : 0;
    const allWithinSlo = plans.every((p) => p.chosen.withinSlo);

    return {
      modelVersion: model.version,
      peakOpsPerSec: rps.peakOpsPerSec,
      paths: plans,
      totals: {
        baselineRowsPerSec,
        optimisedRowsPerSec,
        reduction,
        allWithinSlo,
      },
      improved: reduction > 0,
    };
  }

  /** Derive the per-path request share from the load model targets. */
  private derivedRps(
    paths: QueryPath[],
    env: NodeJS.ProcessEnv,
  ): { peakOpsPerSec: number; perPath: number } {
    const peakOpsPerSec = loadModel(env).peakOpsPerSec;
    // Hot DB paths are the read/scan-heavy subset; a conservative share of the
    // modelled peak drives the per-path request rate.
    const perPath =
      pathCount(paths) > 0 ? (peakOpsPerSec * 0.5) / pathCount(paths) : 0;
    return { peakOpsPerSec, perPath };
  }

  private planForPath(
    path: QueryPath,
    derived: { peakOpsPerSec: number; perPath: number },
    sloMs: number,
  ): OptimisedPathPlan {
    const rps = derived.perPath;

    const waitingRows = Math.round(
      path.baseRows *
        path.waitSetScale *
        (derived.peakOpsPerSec / DEFAULT_PEAK_OPS_PER_SEC),
    );

    const rowsFor = (ap: AccessPath): number =>
      Math.round(waitingRows * ap.selectivity);

    const baseline = path.accessPaths[0];
    const baselineRowsPerRequest = rowsFor(baseline);

    const chosen = [...path.accessPaths]
      .sort((a, b) => rowsFor(a) - rowsFor(b))[0];

    const chosenRowsPerRequest = rowsFor(chosen);
    const chosenRowsPerSec = Math.round(chosenRowsPerRequest * rps);
    const baselineRowsPerSec = Math.round(baselineRowsPerRequest * rps);

    // Projected p99 stays within the SLO when the chosen access path is
    // selective enough relative to a reference scan budget (1ms per ~1k rows).
    const estimatedMs = chosenRowsPerRequest / 1_000;
    const withinSlo = estimatedMs <= sloMs;

    const reduction =
      baselineRowsPerRequest > 0
        ? Number(
            (
              (baselineRowsPerRequest - chosenRowsPerRequest) /
              baselineRowsPerRequest
            ).toFixed(4),
          )
        : 0;

    return {
      name: path.name,
      description: path.description,
      rps: Number(rps.toFixed(1)),
      sloMs,
      baseline: {
        strategy: baseline.strategy,
        rowsPerRequest: baselineRowsPerRequest,
        rowsPerSec: baselineRowsPerSec,
      },
      chosen: {
        strategy: chosen.strategy,
        rowsPerRequest: chosenRowsPerRequest,
        rowsPerSec: chosenRowsPerSec,
        withinSlo,
      },
      reduction,
    };
  }

  /** Representative p99 SLO: median of the modelled per-operation p99 SLOs. */
  private representativeSloMs(env: NodeJS.ProcessEnv): number {
    const slos = loadModel(env)
      .operations.map((o) => o.p99Ms)
      .sort((a, b) => a - b);
    return slos[Math.floor(slos.length / 2)] ?? 400;
  }
}

/** Default modelled peak Ops/sec at 1M users (40.80 baseline), used to scale
 *  wait sets proportionally under env-driven loads. */
const DEFAULT_PEAK_OPS_PER_SEC = 13_333;

function sum(items: OptimisedPathPlan[], f: (p: OptimisedPathPlan) => number): number {
  return items.reduce((acc, p) => acc + f(p), 0);
}

function pathCount(paths: QueryPath[]): number {
  return paths.length;
}
