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
    const communities = await this.repository.discoverPublic(q, limit, cursor);

    const nextCursor =
      communities.length === limit
        ? (communities[communities.length - 1]?.id ?? null)
        : null;

    return {
      items: communities.map(serializeCommunity),
      nextCursor,
    };
  }

  async countDiscoverable(q?: string): Promise<number> {
    return this.repository.countDiscoverable(q);
  }
}
