import {
  Injectable,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ServerPermissionResolverService } from './server-permission-resolver.service';

@Injectable()
export class ServerPermissionService implements OnModuleInit, OnModuleDestroy {
  private readonly CACHE_TTL_MS = 30_000;
  private readonly CACHE_CLEANUP_INTERVAL_MS = 60_000;
  private cleanupTimer?: NodeJS.Timeout;
  private readonly permissionCache = new Map<
    string,
    {
      permissions: Set<ServerPermission>;
      expiresAt: number;
    }
  >();
  private readonly cacheGenerations = new Map<string, number>();
  private readonly inFlight = new Map<string, Promise<Set<ServerPermission>>>();
  constructor(private readonly resolver: ServerPermissionResolverService) {}

  onModuleInit(): void {
    this.cleanupTimer = setInterval(
      () => this.removeExpiredEntries(),
      this.CACHE_CLEANUP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private removeExpiredEntries(): void {
    const now = Date.now();

    for (const [key, entry] of this.permissionCache.entries()) {
      if (entry.expiresAt <= now) {
        this.permissionCache.delete(key);
      }
    }
  }

  private getGeneration(cacheKey: string): number {
    return this.cacheGenerations.get(cacheKey) ?? 0;
  }

  private getCacheKey(
    serverId: string,
    userId: string,
    channelId?: string,
  ): string {
    return `${serverId}:${userId}:${channelId ?? 'server'}`;
  }

  clearCache(serverId: string, userId: string, channelId?: string): void {
    const cacheKey = this.getCacheKey(serverId, userId, channelId);

    this.permissionCache.delete(cacheKey);

    const currentGeneration = this.getGeneration(cacheKey);

    this.cacheGenerations.set(cacheKey, currentGeneration + 1);
  }

  clearUserCache(serverId: string, userId: string) {
    const prefix = `${serverId}:${userId}:`;

    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(prefix)) {
        this.permissionCache.delete(key);
      }
    }
  }

  async getPermissions(
    serverId: string,
    userId: string,
    channelId?: string,
  ): Promise<Set<ServerPermission>> {
    const cacheKey = this.getCacheKey(serverId, userId, channelId);

    const cached = this.permissionCache.get(cacheKey);

    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.permissions;
      }

      // Cache entry expired.
      this.permissionCache.delete(cacheKey);
    }
    const existingRequest = this.inFlight.get(cacheKey);

    if (existingRequest) {
      return existingRequest;
    }
    const permissions = await this.resolver.resolvePermissions(
      serverId,
      userId,
      channelId,
    );

    this.permissionCache.set(cacheKey, {
      permissions: new Set(permissions),
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    const generation = this.getGeneration(cacheKey);
    const resolution = this.resolveAndCache(
      cacheKey,
      generation,
      serverId,
      userId,
      channelId,
    );

    this.inFlight.set(cacheKey, resolution);

    try {
      return await resolution;
    } finally {
      this.inFlight.delete(cacheKey);
    }

    return new Set(permissions);
  }

  async hasPermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
    channelId?: string,
  ): Promise<boolean> {
    const permissions = await this.getPermissions(serverId, userId, channelId);

    return permissions.has(permission);
  }

  async requirePermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
    channelId?: string,
  ): Promise<void> {
    const allowed = await this.hasPermission(
      serverId,
      userId,
      permission,
      channelId,
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private async resolveAndCache(
    cacheKey: string,
    generation: number,
    serverId: string,
    userId: string,
    channelId?: string,
  ): Promise<Set<ServerPermission>> {
    const permissions = await this.resolver.resolvePermissions(
      serverId,
      userId,
      channelId,
    );
    const currentGeneration = this.getGeneration(cacheKey);

    if (currentGeneration !== generation) {
      return permissions;
    }
    this.permissionCache.set(cacheKey, {
      permissions,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return permissions;
  }
}
