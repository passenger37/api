import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeOneTimePreKeyRepository } from '../../e2ee-devices/repositories/e2ee-one-time-prekey.repository';

@Injectable()
export class KeyDistributionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oneTimePreKeyRepo: E2eeOneTimePreKeyRepository,
  ) {}

  async findKeyBundlesForUser(userId: string) {
    const devices = await this.prisma.e2eeDevice.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'asc' },
      include: {
        signedPreKeys: {
          where: { isActive: true },
          take: 1,
        },
        _count: {
          select: {
            oneTimePreKeys: { where: { isConsumed: false } },
          },
        },
      },
    });

    return devices.map((d) => ({
      deviceId: d.id,
      identityKeyPublic: d.identityKeyPublic,
      signedPrekey: d.signedPreKeys[0]
        ? {
            signedPreKeyId: d.signedPreKeys[0].signedPreKeyId,
            publicKey: d.signedPreKeys[0].publicKey,
            signature: d.signedPreKeys[0].signature,
          }
        : null,
      oneTimePrekeyCount: d._count.oneTimePreKeys,
    }));
  }

  async claimOneTimePrekeys(
    userId: string,
    claims: { deviceId: string; count: number }[],
  ) {
    const result: {
      deviceId: string;
      preKeys: { preKeyId: number; publicKey: string }[];
    }[] = [];

    for (const claim of claims) {
      const device = await this.prisma.e2eeDevice.findFirst({
        where: { id: claim.deviceId, userId, isRevoked: false },
        select: { id: true },
      });

      if (!device) {
        result.push({ deviceId: claim.deviceId, preKeys: [] });
        continue;
      }

      const preKeys: { preKeyId: number; publicKey: string }[] = [];
      for (let i = 0; i < claim.count; i++) {
        const claimed = await this.oneTimePreKeyRepo.consumeNext(
          claim.deviceId,
        );
        if (!claimed) break;
        preKeys.push({
          preKeyId: claimed.preKeyId,
          publicKey: claimed.publicKey,
        });
      }

      result.push({ deviceId: claim.deviceId, preKeys });
    }

    return { claimed: result };
  }
}
