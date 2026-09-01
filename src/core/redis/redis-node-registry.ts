import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { hostname } from 'os';
import { randomUUID } from 'crypto';
import { RedisService } from './redis.service';
import { redisKeys } from './redis-keys';

export interface RegisteredNode {
  nodeId: string;
  hostname: string;
  pid: number;
  startedAt: string;
  lastSeenAt: string;
}

const DEFAULT_HEARTBEAT_TTL_SEC = 30;

/** Heartbeat TTL for a registered API node (seconds). */
export function nodeHeartbeatTtlSec(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.NODE_HEARTBEAT_TTL_SEC);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_HEARTBEAT_TTL_SEC;
}

/** Stable per-process instance id used to identify this node across instances. */
export function resolveNodeId(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.NODE_ID?.trim();
  if (explicit) return explicit;
  return `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
}

/**
 * Lecture 40.81 — Multi-Instance WebSocket / horizontal scaling primitive.
 *
 * Each running API node registers its identity + capabilities in Redis with a
 * heartbeat TTL, so a scaling controller / load balancer can enumerate the
 * live instances (and, by extension, gauge the distribution of socket.io
 * connections across the cluster). Registration is advisory — a node that dies
 * simply stops renewing its TTL and disappears from the registry.
 */
@Injectable()
export class RedisNodeRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisNodeRegistry.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly nodeId: string;
  private readonly ttlSec: number;

  constructor(private readonly redis: RedisService) {
    this.nodeId = resolveNodeId();
    this.ttlSec = nodeHeartbeatTtlSec();
  }

  async onModuleInit(): Promise<void> {
    await this.register();

    const intervalMs = Math.max(1, Math.floor((this.ttlSec * 1000) / 3));
    this.timer = setInterval(() => {
      void this.renew().catch((err) => {
        this.logger.error('Node heartbeat renewal failed', { err, nodeId: this.nodeId });
      });
    }, intervalMs);
    // Do not keep the event loop alive purely for heartbeats.
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.deregister().catch(() => undefined);
  }

  instanceId(): string {
    return this.nodeId;
  }

  private record(): RegisteredNode {
    return {
      nodeId: this.nodeId,
      hostname: hostname(),
      pid: process.pid,
      startedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
  }

  /** Publish/refresh this node's record with a fresh heartbeat TTL. */
  async register(): Promise<void> {
    const client = this.redis.getClient();
    await client.set(
      redisKeys.node(this.nodeId),
      JSON.stringify(this.record()),
      { EX: this.ttlSec },
    );
  }

  /** Alias of `register` used by the heartbeat. */
  async renew(): Promise<void> {
    await this.register();
  }

  /** Remove this node's record on graceful shutdown. */
  async deregister(): Promise<void> {
    const client = this.redis.getClient();
    await client.del(redisKeys.node(this.nodeId));
  }

  /** Enumerate the live registered nodes (instances still sending heartbeats). */
  async listInstances(): Promise<RegisteredNode[]> {
    const client = this.redis.getClient();
    const keys = await client.keys(redisKeys.nodesPattern());
    const nodes: RegisteredNode[] = [];
    for (const key of keys) {
      const raw = await client.get(key);
      if (!raw) continue;
      try {
        nodes.push(JSON.parse(raw) as RegisteredNode);
      } catch {
        // Ignore malformed records (e.g. mid-cleanup).
      }
    }
    return nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  async countInstances(): Promise<number> {
    return (await this.listInstances()).length;
  }
}
