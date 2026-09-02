import { Injectable } from '@nestjs/common';

export type Labels = Record<string, string | number>;

interface CounterMetric {
  values: Map<string, number>;
}

interface HistogramMetric {
  buckets: number[];
  values: Map<string, { sum: number; count: number; byBucket: number[] }>;
}

const DEFAULT_HISTOGRAM_BUCKETS = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000,
];

/**
 * Lightweight in-memory metrics store exposing Prometheus-style counters and
 * histograms. No external dependency — values are aggregated in-process and
 * rendered as Prometheus text format on the `/metrics` endpoint. Designed to
 * be fed from the existing structured log fields (module/operation/durationMs).
 */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, CounterMetric>();
  private readonly histograms = new Map<string, HistogramMetric>();

  private registerCounter(name: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, { values: new Map() });
    }
  }

  private registerHistogram(name: string, buckets: number[]): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        buckets: [...buckets].sort((a, b) => a - b),
        values: new Map(),
      });
    }
  }

  private labelKey(labels: Labels = {}): string {
    return Object.keys(labels)
      .sort()
      .map((k) => `${k}="${labels[k]}"`)
      .join(',');
  }

  /** Increment a counter by `by` (default 1). */
  increment(name: string, labels: Labels = {}, by = 1): void {
    this.registerCounter(name);
    const key = this.labelKey(labels);
    const current = this.counters.get(name)!.values.get(key) ?? 0;
    this.counters.get(name)!.values.set(key, current + by);
  }

  /** Record a value into a histogram (bucketed where configured). */
  observe(name: string, value: number, labels: Labels = {}): void {
    this.registerHistogram(name, DEFAULT_HISTOGRAM_BUCKETS);
    const hist = this.histograms.get(name)!;
    const key = this.labelKey(labels);
    const entry = hist.values.get(key) ?? { sum: 0, count: 0, byBucket: [] };
    entry.sum += value;
    entry.count += 1;
    if (entry.byBucket.length === 0) {
      entry.byBucket = new Array<number>(hist.buckets.length).fill(0);
    }
    for (let i = 0; i < hist.buckets.length; i++) {
      if (value <= hist.buckets[i]) {
        entry.byBucket[i] += 1;
      }
    }
    hist.values.set(key, entry);
  }

  /** Duration helper in milliseconds. */
  observeDuration(name: string, durationMs: number, labels: Labels = {}): void {
    this.observe(name, durationMs, labels);
  }

  getCount(name: string, labels: Labels = {}): number {
    const counter = this.counters.get(name);
    if (!counter) return 0;
    return counter.values.get(this.labelKey(labels)) ?? 0;
  }

  /**
   * Estimate percentiles (e.g. p50/p99) from a registered histogram using
   * linear interpolation within the containing cumulative bucket. Returns
   * `null` when the histogram (or label set) has no observations.
   */
  percentiles(
    name: string,
    labels: Labels = {},
    percentiles: number[] = [50, 95, 99],
  ): Array<{ percentile: number; valueMs: number | null }> | null {
    const hist = this.histograms.get(name);
    if (!hist) return null;
    const entry = hist.values.get(this.labelKey(labels));
    if (!entry || entry.count === 0) return null;

    const out: Array<{ percentile: number; valueMs: number | null }> = [];
    for (const p of percentiles) {
      const target = (p / 100) * entry.count;
      let cumulative = 0;
      let valueMs: number | null = null;
      for (let i = 0; i < hist.buckets.length; i++) {
        const prevCumulative = cumulative;
        cumulative += entry.byBucket[i];
        if (cumulative >= target && entry.byBucket[i] > 0) {
          const width = hist.buckets[i] - (i > 0 ? hist.buckets[i - 1] : 0);
          const into = target - prevCumulative;
          const frac = Math.min(1, Math.max(0, into / entry.byBucket[i]));
          valueMs = (i > 0 ? hist.buckets[i - 1] : 0) + frac * width;
          break;
        }
      }
      if (valueMs === null) valueMs = hist.buckets[hist.buckets.length - 1];
      out.push({ percentile: p, valueMs: Number(valueMs.toFixed(2)) });
    }
    return out;
  }

  /**
   * Percentiles computed across every label set of a histogram combined into a
   * single aggregate distribution (used to evaluate global latency SLOs where
   * the per-route label space is intentionally unbounded in cardinality).
   */
  aggregatePercentiles(
    name: string,
    percentiles: number[] = [50, 95, 99],
  ): {
    count: number;
    sum: number;
    percentiles: Array<{ percentile: number; valueMs: number }>;
  } | null {
    const hist = this.histograms.get(name);
    if (!hist) return null;
    const n = hist.buckets.length;
    const counts = new Array<number>(n).fill(0);
    let count = 0;
    let sum = 0;
    for (const entry of hist.values.values()) {
      count += entry.count;
      sum += entry.sum;
      for (let i = 0; i < n; i++) counts[i] += entry.byBucket[i];
    }
    if (count === 0)
      return {
        count: 0,
        sum: 0,
        percentiles: percentiles.map((p) => ({ percentile: p, valueMs: 0 })),
      };

    const result = percentiles.map((p) => {
      const target = (p / 100) * count;
      let cumulative = 0;
      let valueMs = hist.buckets[n - 1];
      for (let i = 0; i < n; i++) {
        const prevCumulative = cumulative;
        cumulative += counts[i];
        if (cumulative >= target && counts[i] > 0) {
          const width = hist.buckets[i] - (i > 0 ? hist.buckets[i - 1] : 0);
          const frac = Math.min(
            1,
            Math.max(0, (target - prevCumulative) / counts[i]),
          );
          valueMs = (i > 0 ? hist.buckets[i - 1] : 0) + frac * width;
          break;
        }
      }
      return { percentile: p, valueMs: Number(valueMs.toFixed(2)) };
    });
    return { count, sum, percentiles: result };
  }

  /**
   * Enumerate the distinct label sets recorded on a histogram (used by the
   * 40.97 profiler to build per-route latency tables without unbounded
   * cardinality assumptions).
   */
  histogramLabelSets(name: string): Labels[] {
    const hist = this.histograms.get(name);
    if (!hist) return [];
    return [...hist.values.keys()].map((key) => {
      if (!key) return {};
      const labels: Labels = {};
      for (const part of key.split(',')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const k = part.slice(0, eq);
        const raw = part.slice(eq + 1);
        const v =
          raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
        labels[k] = v;
      }
      return labels;
    });
  }

  /** Observation count for a histogram + exact label set (0 when absent). */
  histogramCount(name: string, labels: Labels = {}): number {
    const hist = this.histograms.get(name);
    if (!hist) return 0;
    return hist.values.get(this.labelKey(labels))?.count ?? 0;
  }

  /** Current in-memory snapshot for tests/inspection. */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, counter] of this.counters) {
      for (const [key, value] of counter.values) {
        out[key ? `${name}{${key}}` : name] = value;
      }
    }
    return out;
  }

  /** Render all metrics as Prometheus text format. */
  renderPrometheus(): string {
    const lines: string[] = [];

    for (const [name, counter] of this.counters) {
      for (const [key, value] of counter.values) {
        lines.push(key ? `${name}{${key}} ${value}` : `${name} ${value}`);
      }
    }

    for (const [name, hist] of this.histograms) {
      for (const [key, entry] of hist.values) {
        // label prefix, e.g. `{k="v"` (or empty for no labels)
        const labelOpen = key ? `{${key}` : '';
        let cumulative = 0;
        for (let i = 0; i < hist.buckets.length; i++) {
          cumulative += entry.byBucket[i];
          const le = labelOpen ? `${labelOpen},le="${hist.buckets[i]}"}` : ``;
          lines.push(`${name}_bucket${le} ${cumulative}`);
        }
        const inf = labelOpen ? `${labelOpen},le="+Inf"}` : ``;
        const sum = key ? `{${key}}` : '';
        lines.push(`${name}_bucket${inf} ${entry.count}`);
        lines.push(`${name}_sum${sum} ${entry.sum}`);
        lines.push(`${name}_count${sum} ${entry.count}`);
      }
    }

    return lines.length ? `${lines.join('\n')}\n` : '';
  }
}
