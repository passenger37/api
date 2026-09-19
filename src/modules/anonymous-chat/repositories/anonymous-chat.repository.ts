import { Injectable } from '@nestjs/common';
import {
  AnonymousChatBan,
  AnonymousChatMessage,
  AnonymousChatParticipant,
  AnonymousChatReport,
  AnonymousChatRoom,
  AnonymousChatSession,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AnonymousChatEndReason,
  AnonymousChatRoomStatus,
} from '../types/anonymous-chat.types';

@Injectable()
export class AnonymousChatSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.AnonymousChatSessionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession> {
    const client = tx ?? this.prisma;
    return client.anonymousChatSession.create({ data });
  }

  findById(id: string): Promise<AnonymousChatSession | null> {
    return this.prisma.anonymousChatSession.findUnique({ where: { id } });
  }

  /** WAITING or MATCHED sessions — the user is engaged with anonymous chat. */
  findEngagedByUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession | null> {
    const client = tx ?? this.prisma;
    return client.anonymousChatSession.findFirst({
      where: { userId, status: { in: ['WAITING', 'MATCHED'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findWaitingByUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession | null> {
    const client = tx ?? this.prisma;
    return client.anonymousChatSession.findFirst({
      where: { userId, status: 'WAITING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  expireStale(
    before: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession[]> {
    const client = tx ?? this.prisma;
    return client.anonymousChatSession.findMany({
      where: { status: 'WAITING', expiresAt: { lt: before } },
    });
  }

  update(
    id: string,
    data: Prisma.AnonymousChatSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession> {
    const client = tx ?? this.prisma;
    return client.anonymousChatSession.update({ where: { id }, data });
  }

  markMatched(
    id: string,
    matchedRoomId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession> {
    return this.update(
      id,
      { status: 'MATCHED', matchedRoomId, updatedAt: new Date() },
      tx,
    );
  }

  markCancelled(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession> {
    return this.update(
      id,
      { status: 'CANCELLED', endedAt: new Date(), updatedAt: new Date() },
      tx,
    );
  }

  markExpired(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatSession> {
    return this.update(
      id,
      { status: 'EXPIRED', endedAt: new Date(), updatedAt: new Date() },
      tx,
    );
  }
}

@Injectable()
export class AnonymousChatParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.AnonymousChatParticipantUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatParticipant> {
    const client = tx ?? this.prisma;
    return client.anonymousChatParticipant.create({ data });
  }

  findById(id: string): Promise<AnonymousChatParticipant | null> {
    return this.prisma.anonymousChatParticipant.findUnique({ where: { id } });
  }

  findBySessionId(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatParticipant | null> {
    const client = tx ?? this.prisma;
    return client.anonymousChatParticipant.findUnique({
      where: { sessionId },
    });
  }

  findByRoomId(
    roomId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatParticipant[]> {
    const client = tx ?? this.prisma;
    return client.anonymousChatParticipant.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** The participant's active (non-closed) anonymous room, if any. */
  async findActiveRoomByUser(userId: string): Promise<{
    room: AnonymousChatRoom;
    participant: AnonymousChatParticipant;
  } | null> {
    const participant = await this.prisma.anonymousChatParticipant.findFirst({
      where: { userId, AnonymousChatRoom: { status: 'ACTIVE' } },
      include: { AnonymousChatRoom: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!participant?.AnonymousChatRoom) return null;
    return { room: participant.AnonymousChatRoom, participant };
  }

  async findRoomInfoBySessionId(sessionId: string): Promise<{
    room: AnonymousChatRoom;
    participant: AnonymousChatParticipant;
  } | null> {
    const participant = await this.prisma.anonymousChatParticipant.findUnique({
      where: { sessionId },
      include: { AnonymousChatRoom: true },
    });

    if (!participant?.AnonymousChatRoom) return null;
    return { room: participant.AnonymousChatRoom, participant };
  }

  markDisconnected(
    participantId: string,
    at: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatParticipant> {
    const client = tx ?? this.prisma;
    return client.anonymousChatParticipant.update({
      where: { id: participantId },
      data: { disconnectedAt: at },
    });
  }

  markConnected(
    participantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatParticipant> {
    const client = tx ?? this.prisma;
    return client.anonymousChatParticipant.update({
      where: { id: participantId },
      data: { disconnectedAt: null },
    });
  }
}

@Injectable()
export class AnonymousChatRoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.AnonymousChatRoomCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatRoom> {
    const client = tx ?? this.prisma;
    return client.anonymousChatRoom.create({ data });
  }

  findById(id: string): Promise<AnonymousChatRoom | null> {
    return this.prisma.anonymousChatRoom.findUnique({ where: { id } });
  }

  /** Finds ACTIVE rooms that have at least one participant disconnected too long. */
  findActiveRoomsWithStaleDisconnects(graceBefore: Date): Promise<
    Prisma.AnonymousChatRoomGetPayload<{
      include: { AnonymousChatParticipant: true };
    }>[]
  > {
    return this.prisma.anonymousChatRoom.findMany({
      where: {
        status: 'ACTIVE',
        AnonymousChatParticipant: {
          some: { disconnectedAt: { not: null, lt: graceBefore } },
        },
      },
      include: { AnonymousChatParticipant: true },
    });
  }

  close(
    id: string,
    input: {
      endReason: AnonymousChatEndReason;
      endedByUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatRoom> {
    const client = tx ?? this.prisma;
    return client.anonymousChatRoom.update({
      where: { id },
      data: {
        status: AnonymousChatRoomStatus.CLOSED,
        endReason: input.endReason,
        endedByUserId: input.endedByUserId ?? null,
        endedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  touchLastMessage(
    id: string,
    at: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatRoom> {
    const client = tx ?? this.prisma;
    return client.anonymousChatRoom.update({
      where: { id },
      data: { lastMessageAt: at, updatedAt: at },
    });
  }
}

@Injectable()
export class AnonymousChatMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a message. Returns `null` when the `clientMessageId` is already
   * known for this room (idempotency / replay dedupe).
   */
  async create(
    data: Prisma.AnonymousChatMessageUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatMessage | null> {
    const client = tx ?? this.prisma;
    try {
      return await client.anonymousChatMessage.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  findRecentByRoom(roomId: string, take = 50): Promise<AnonymousChatMessage[]> {
    return this.prisma.anonymousChatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}

@Injectable()
export class AnonymousChatReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.AnonymousChatReportUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatReport> {
    const client = tx ?? this.prisma;
    return client.anonymousChatReport.create({ data });
  }

  countByReporterSince(
    reporterParticipantId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.anonymousChatReport.count({
      where: { reporterParticipantId, createdAt: { gte: since } },
    });
  }
}

@Injectable()
export class AnonymousChatBanRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.AnonymousChatBanUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AnonymousChatBan> {
    const client = tx ?? this.prisma;
    return client.anonymousChatBan.create({ data });
  }

  existsActive(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;
    return client.anonymousChatBan
      .findFirst({
        where: {
          userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      })
      .then((ban) => !!ban);
  }
}
