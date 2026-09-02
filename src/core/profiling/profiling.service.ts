import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  PROFILE_AREAS,
  ProfileAreaId,
  RouteLatencyRow,
  SessionProfile,
  DeltaReport,
} from './profiling.types';
import {
  profilingBudgets,
  ProfileBudget,
  PROFILING_DATA_DIR,
  PROFILING_DATA_FILE,
  SESSION_RING_CAP,
  unitFor,
  wsProbeMessages,
} from './profiling.config';
import {
  assessArea,
  buildDeltaReport,
  evaluateOverall,
} from './profiling-stats';
import {
  ProbeResult,
  PostgresProbe,
  RedisProbe,
  sampleEventLoopLag,
  sampleHttpRoundTrip,
  sampleMemory,
  samplePostgresPing,
  sampleProcessCpu,
  sampleRedisPing,
  sampleWebSocketRoundTrips,
} from './profiling-samplers';

export interface RunSessionOptions {
  samples?: number;
  /** Override samplers deterministically (hermetic tests). */
  samplers?: Partial<Record<ProfileAreaId, () => Promise<ProbeResult>>>;
}

/**
 * Lecture 40.97 — Performance Profiling. Runs a profiling session across the
 * B2 40.87 study list, evaluates each area against its reference budget, and
 * keeps history (in-memory ring + persistent JSONL) so later sessions report
 * deltas against baseline — "measure before optimizing", never intuition.
 */
@Injectable()
export class PerformanceProfilingService implements OnModuleInit {
  private readonly ring: SessionProfile[] = [];
  private readonly dataDir: string;
  private readonly filePath: string;
  private readonly instanceId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
    @Optional() @Inject(RedisService) private readonly redis?: RedisService,
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
  ) {
    this.dataDir =
      this.typed('PROFILE_DATA_DIR', PROFILING_DATA_DIR) ?? PROFILING_DATA_DIR;
    this.filePath = path.join(this.dataDir, PROFILING_DATA_FILE);
    this.instanceId = process.env.NODE_ID ?? os.hostname();
  }

  onModuleInit(): void {
    this.loadPersisted();
  }

  private typed<T>(key: string, fallback: T): T {
    return this.config.get(key, fallback);
  }

  getBudgets(): ProfileBudget[] {
    return profilingBudgets(process.env);
  }

  /** Local base URL used by the network + WebSocket probes, or null. */
  private selfBaseUrl(): string | null {
    const port = this.typed('PORT', process.env.PORT ?? '3001');
    if (!port) return null;
    return `http://127.0.0.1:${port}`;
  }

  private async runArea(
    budget: ProfileBudget,
    sampler: () => Promise<ProbeResult>,
  ): Promise<ReturnType<typeof assessArea>> {
    try {
      const result = await sampler();
      const noteExtra = result.extra
        ? `; ${Object.entries(result.extra)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`
        : '';
      const assessment = assessArea(
        budget.area,
        budget.unit,
        budget.budget,
        result.values,
      );
      return { ...assessment, note: assessment.note + noteExtra };
    } catch (err) {
      return assessArea(
        budget.area,
        budget.unit,
        budget.budget,
        [],
        err instanceof Error ? err.message : 'sample failed',
      );
    }
  }

  async runSession(options?: RunSessionOptions): Promise<SessionProfile> {
    const started = new Date();
    const budgets = this.getBudgets();
    const samples = options?.samples ?? budgets[0]?.samples ?? 20;
    const baseUrl = this.selfBaseUrl();
    const overrides = options?.samplers ?? {};

    const areaOrder = PROFILE_AREAS as readonly ProfileAreaId[];
    const tasks = new Map<ProfileAreaId, () => Promise<ProbeResult>>();
    for (const area of areaOrder) {
      const override = overrides[area];
      if (override) {
        tasks.set(area, override);
        continue;
      }
      switch (area) {
        case 'cpu':
          tasks.set(area, () =>
            sampleProcessCpu({ samples: Math.max(2, Math.min(samples, 5)) }),
          );
          break;
        case 'memory':
          tasks.set(area, () =>
            sampleMemory({ samples: Math.min(samples, 3) }),
          );
          break;
        case 'event-loop':
          tasks.set(area, () => sampleEventLoopLag({ samples }));
          break;
        case 'postgres':
          tasks.set(
            area,
            this.prisma
              ? () =>
                  samplePostgresPing({
                    prisma: this.prisma as PostgresProbe,
                    samples: 3,
                  })
              : () => Promise.reject(new Error('Prisma not injected')),
          );
          break;
        case 'redis':
          tasks.set(
            area,
            this.redis
              ? () =>
                  sampleRedisPing({
                    redis: this.redis as RedisProbe,
                    samples: 3,
                  })
              : () => Promise.reject(new Error('Redis not injected')),
          );
          break;
        case 'network':
          tasks.set(
            area,
            baseUrl
              ? () => sampleHttpRoundTrip({ baseUrl, samples: 5 })
              : () => Promise.reject(new Error('No local HTTP endpoint')),
          );
          break;
        case 'websocket':
          tasks.set(
            area,
            baseUrl
              ? () =>
                  sampleWebSocketRoundTrips({
                    baseUrl,
                    messages: wsProbeMessages(process.env),
                  })
              : () => Promise.reject(new Error('No local WebSocket endpoint')),
          );
          break;
      }
    }

    const running = new Map<
      ProfileAreaId,
      Promise<ReturnType<typeof assessArea>>
    >(
      areaOrder.map((area) => {
        const task = tasks.get(area);
        if (!task) {
          return [
            area,
            Promise.resolve(
              assessArea(area, unitFor(area), 0, [], `No ${area} sampler`),
            ),
          ];
        }
        const budget = budgets.find((b) => b.area === area)!;
        return [area, this.runArea(budget, task)];
      }),
    );

    const areas = await Promise.all(
      areaOrder.map(async (area) => running.get(area)!),
    );

    const session: SessionProfile = {
      id: crypto.randomUUID(),
      startedAt: started.toISOString(),
      finishedAt: new Date().toISOString(),
      instanceId: this.instanceId,
      sampleCount: samples,
      areas,
      routes: this.routeTable(),
      overall: evaluateOverall(areas),
    };

    this.ring.unshift(session);
    if (this.ring.length > SESSION_RING_CAP) this.ring.pop();
    this.persist(session);

    return session;
  }

  /** Per-route HTTP latency table from the live request histograms. */
  routeTable(): RouteLatencyRow[] {
    const rows = this.metrics
      .histogramLabelSets('http_request_duration_ms')
      .map((labels) => {
        const pcts =
          this.metrics.percentiles(
            'http_request_duration_ms',
            labels,
            [50, 95, 99],
          ) ?? [];
        const get = (p: number) =>
          pcts.find((x) => x.percentile === p)?.valueMs ?? null;
        return {
          method: String(labels.method ?? 'UNKNOWN'),
          route: String(labels.route ?? 'unknown'),
          requests: this.metrics.histogramCount(
            'http_request_duration_ms',
            labels,
          ),
          p50Ms: get(50),
          p95Ms: get(95),
          p99Ms: get(99),
        };
      })
      .sort((a, b) => b.requests - a.requests);
    return rows;
  }

  listSessions(limit?: number): SessionProfile[] {
    return this.ring.slice(0, limit ?? SESSION_RING_CAP);
  }

  latestSession(): SessionProfile | null {
    return this.ring[0] ?? null;
  }

  /** Baseline is the oldest retained session (first recorded measurement). */
  baselineSession(): SessionProfile | null {
    return this.ring[this.ring.length - 1] ?? null;
  }

  delta(): DeltaReport {
    return buildDeltaReport(this.baselineSession(), this.latestSession());
  }

  private loadPersisted(): void {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const lines = fs
        .readFileSync(this.filePath, 'utf8')
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as SessionProfile;
          if (parsed && typeof parsed.id === 'string') this.ring.push(parsed);
        } catch {
          // skip malformed/partial lines from a crashed append
        }
      }
      this.ring.reverse();
      if (this.ring.length > SESSION_RING_CAP) {
        this.ring.length = SESSION_RING_CAP;
      }
    } catch {
      // never fail boot on an unreadable history file
    }
  }

  private persist(session: SessionProfile): void {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(session)}\n`, 'utf8');
    } catch {
      // persistence is best-effort; the in-memory ring still serves /profiling
    }
  }
}
