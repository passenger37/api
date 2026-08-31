import { Injectable, NotFoundException } from '@nestjs/common';
import { KeyDistributionRepository } from '../repositories/key-distribution.repository';
import { ClaimKeyBundlesRequestDto } from '../dto/claim-key-bundles.request';

@Injectable()
export class KeyDistributionCommandService {
  constructor(private readonly repo: KeyDistributionRepository) {}

  async claimKeyBundles(targetUserId: string, dto: ClaimKeyBundlesRequestDto) {
    const totalRequested = dto.claims.reduce((sum, c) => sum + c.count, 0);
    if (totalRequested > 100) {
      throw new NotFoundException('Too many prekeys requested');
    }

    for (const claim of dto.claims) {
      const device = await this.repo.findKeyBundlesForUser(targetUserId);
      const exists = device.find((d) => d.deviceId === claim.deviceId);
      if (!exists) {
        throw new NotFoundException(
          `Device ${claim.deviceId} not found or revoked`,
        );
      }
    }

    return this.repo.claimOneTimePrekeys(targetUserId, dto.claims);
  }
}
