import { Injectable } from '@nestjs/common';

import { CommunityRepository } from '../repositories/community.repository';
import { CommunityListResponse } from '../dto/response';
import { serializeCommunity } from '../mappers/community.mapper';

@Injectable()
export class CommunityDiscoveryService {
  constructor(private readonly repository: CommunityRepository) {}

  async discover(
    q?: string,
    cursor?: string,
    limit = 20,
  ): Promise<CommunityListResponse> {
    const rows = await this.repository.discoverPublic(q, limit, cursor);

    const hasMore = rows.length > limit;
    const communities = hasMore ? rows.slice(0, limit) : rows;
    const last = communities[communities.length - 1];

    return {
      items: communities.map(serializeCommunity),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async countDiscoverable(q?: string): Promise<number> {
    return this.repository.countDiscoverable(q);
  }
}
