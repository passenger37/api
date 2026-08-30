import { Injectable } from '@nestjs/common';
import { ModerationAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ModerationAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      serverId: string;
      actorMemberId: string;
      action: ModerationAction;
      targetUserId?: string | null;
      targetMemberId?: string | null;
      reason?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.moderationAuditLog.create({
      data,
    });
  }

  async listByServer(
    serverId: string,
    options: {
      action?: ModerationAction;
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    const { action, cursorId, limit = 50 } = options;

    return this.prisma.moderationAuditLog.findMany({
      where: {
        serverId,

        ...(action ? { action } : {}),

        ...(cursorId
          ? {
              id: {
                gt: cursorId,
              },
            }
          : {}),
      },

      include: {
        actor: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },

      orderBy: {
        id: 'asc',
      },

      take: limit,
    });
  }
}
