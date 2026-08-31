import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeRatchetState, Prisma } from '@prisma/client';

@Injectable()
export class E2eeRatchetStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeRatchetStateCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeRatchetState> {
    const client = tx ?? this.prisma;
    return client.e2eeRatchetState.create({ data });
  }

  async findBySessionId(sessionId: string): Promise<E2eeRatchetState | null> {
    return this.prisma.e2eeRatchetState.findUnique({ where: { sessionId } });
  }

  async update(
    sessionId: string,
    data: Partial<E2eeRatchetState>,
  ): Promise<E2eeRatchetState> {
    return this.prisma.e2eeRatchetState.update({
      where: { sessionId },
      data,
    });
  }

  async delete(sessionId: string): Promise<void> {
    await this.prisma.e2eeRatchetState.delete({ where: { sessionId } });
  }
}