import { Injectable, NotFoundException } from '@nestjs/common';
import { KeyDistributionRepository } from '../repositories/key-distribution.repository';

@Injectable()
export class KeyDistributionQueryService {
  constructor(private readonly repo: KeyDistributionRepository) {}

  async getKeyBundles(userId: string) {
    const bundles = await this.repo.findKeyBundlesForUser(userId);
    if (!bundles.length) {
      throw new NotFoundException('No active devices found for user');
    }
    return { devices: bundles };
  }
}
