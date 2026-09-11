import { Injectable } from '@nestjs/common';
import { DirectMessageChannelSettings, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

interface SettingsUpdate {
  isMuted?: boolean;
  isArchived?: boolean;
  isHidden?: boolean;
  isPinned?: boolean;
}

@Injectable()
export class DirectMessageChannelSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    channelId: string,
    userId: string,
  ): Promise<DirectMessageChannelSettings | null> {
    return this.prisma.directMessageChannelSettings.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });
  }

  async upsert(
    channelId: string,
    userId: string,
    data: SettingsUpdate,
    tx?: Prisma.TransactionClient,
  ): Promise<DirectMessageChannelSettings> {
    const client = tx ?? this.prisma;

    return client.directMessageChannelSettings.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },

      create: {
        channel: {
          connect: {
            id: channelId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        ...this.timestampsFor(data),
      },

      update: this.timestampsFor(data),
    });
  }

  async findForUser(
    userId: string,
    channelIds?: string[],
  ): Promise<DirectMessageChannelSettings[]> {
    return this.prisma.directMessageChannelSettings.findMany({
      where: {
        userId,
        ...(channelIds && channelIds.length
          ? { channelId: { in: channelIds } }
          : {}),
      },
    });
  }

  private timestampsFor(
    data: SettingsUpdate,
  ): Record<string, Date | boolean | null | undefined> {
    const now = new Date();
    const update: Record<string, Date | boolean | null | undefined> = {};

    update.isMuted = data.isMuted;
    update.mutedAt =
      data.isMuted === true ? now : data.isMuted === false ? null : undefined;

    update.isArchived = data.isArchived;
    update.archivedAt =
      data.isArchived === true
        ? now
        : data.isArchived === false
          ? null
          : undefined;

    update.isHidden = data.isHidden;
    update.hiddenAt =
      data.isHidden === true ? now : data.isHidden === false ? null : undefined;

    update.isPinned = data.isPinned;
    update.pinnedAt =
      data.isPinned === true ? now : data.isPinned === false ? null : undefined;

    for (const key of Object.keys(update)) {
      if (update[key] === undefined) {
        delete update[key];
      }
    }

    return update;
  }
}
