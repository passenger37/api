import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

export interface CallMetrics {
  callsCreated: number;
  callsAccepted: number;
  callsRejected: number;
  callsCancelled: number;
  callsEnded: number;
  callsFailed: number;
  avgDurationMs: number;
  connectionSuccessRate: number;
  iceFailureRate: number;
  wsDisconnectRate: number;
}

@Injectable()
export class CallMetricsService {
  private readonly METRICS_KEY = 'calling:metrics';
  private readonly METRICS_TTL = 86400;

  constructor(private readonly redis: RedisService) {}

  private get client() {
    return this.redis.getClient();
  }

  async increment(metric: keyof CallMetrics, value = 1): Promise<void> {
    await this.client.hIncrBy(this.METRICS_KEY, metric, value);
    await this.client.expire(this.METRICS_KEY, this.METRICS_TTL);
  }

  async incrementBy(metric: keyof CallMetrics, value: number): Promise<void> {
    await this.client.hIncrBy(this.METRICS_KEY, metric, value);
    await this.client.expire(this.METRICS_KEY, this.METRICS_TTL);
  }

  async recordCallDuration(durationMs: number): Promise<void> {
    const key = `${this.METRICS_KEY}:durations`;
    await this.client.lPush(key, durationMs.toString());
    await this.client.lTrim(key, 0, 999);
    await this.client.expire(key, this.METRICS_TTL);
  }

  async recordIceFailure(): Promise<void> {
    await this.increment('callsFailed');
  }

  async recordWsDisconnect(): Promise<void> {
    await this.increment('callsFailed');
  }

  async getMetrics(): Promise<Partial<CallMetrics>> {
    const raw = await this.client.hGetAll(this.METRICS_KEY);
    const metrics: Partial<CallMetrics> = {};
    for (const [k, v] of Object.entries(raw)) {
      (metrics as Record<string, number>)[k] = parseInt(v, 10);
    }
    const durations = await this.client.lRange(
      `${this.METRICS_KEY}:durations`,
      0,
      -1,
    );
    if (durations.length > 0) {
      const sum = durations.reduce((a, b) => a + parseInt(b, 10), 0);
      metrics.avgDurationMs = Math.round(sum / durations.length);
    }
    return metrics;
  }

  async reset(): Promise<void> {
    await this.client.del([this.METRICS_KEY, `${this.METRICS_KEY}:durations`]);
  }
}
