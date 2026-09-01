import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';
import { DbCacheService } from '../../../core/cache/db-cache.service';
import { redisKeys } from '../../../core/redis/redis-keys';

@Injectable()
export class ServerMemberService {
  constructor(
    private readonly memberRepository: ServerMemberRepository,
    private readonly roleRepository: ServerRoleRepository,
    private readonly roleAssignmentRepository: ServerRoleAssignmentRepository,
    private readonly dbCache: DbCacheService,
  ) {}

  async getMember(serverId: string, userId: string) {
    return this.memberRepository.findByServerAndUser(serverId, userId);
  }

  /** Evict the per-server caches affected by a membership change (40.83). */
  async invalidateMemberCache(serverId: string, userId: string): Promise<void> {
    await this.dbCache.delMany('serverMembers', [
      redisKeys.serverMemberCount(serverId),
      redisKeys.serverMembersByUser(userId),
    ]);
  }

  /**
   * Creates a server membership and assigns the default "Member" role so the
   * user can view the server and use its channels.
   */
  async createMemberWithDefaultRole(
    serverId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const member = await this.memberRepository.create(
      {
        server: {
          connect: {
            id: serverId,
          },
        },

        user: {
          connect: {
            id: userId,
          },
        },
      },
      tx,
    );

    const memberRole = await this.roleRepository.findByName(
      serverId,
      'Member',
      tx,
    );

    if (memberRole) {
      const alreadyAssigned = await this.roleAssignmentRepository.exists(
        member.id,
        memberRole.id,
        tx,
      );

      if (!alreadyAssigned) {
        await this.roleAssignmentRepository.create(
          {
            member: {
              connect: {
                id: member.id,
              },
            },

            role: {
              connect: {
                id: memberRole.id,
              },
            },
          },
          tx,
        );
      }
    }

    // Write-through invalidation (40.83): evict the member-count / servers-by-user
    // caches so the next read re-populates from the database. Best-effort here
    // inside the joining transaction; a read racing the commit may briefly see a
    // stale count, which the short TTL bounds.
    await this.invalidateMemberCache(serverId, userId);

    return member;
  }
}
