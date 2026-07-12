import { Injectable } from '@nestjs/common';
import { Prisma, UserSession } from '@prisma/client';

import { PrismaService } from '../../../core/database';

@Injectable()
export class SessionsRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    data: Prisma.UserSessionCreateInput,
  ): Promise<UserSession> {
    return this.prisma.userSession.create({
      data,
    });
  }

  async findByUserId(userId: string) {
  return this.prisma.userSession.findFirst({
    where: {
      userId,
      isRevoked: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async updateRefreshToken(
  id: string,
  refreshTokenHash: string,
  expiresAt: Date,
) {
  return this.prisma.userSession.update({
    where: {
      id,
    },
    data: {
      refreshTokenHash,
      expiresAt,
    },
  });
}

async findBySessionId(
  sessionId: string,
) {
  return this.prisma.userSession.findUnique({
    where: {
      sessionId,
    },
  });
}

async update(
  id: string,
  data: Prisma.UserSessionUpdateInput,
) {
  return this.prisma.userSession.update({
    where: {
      id,
    },
    data,
  });
}

async revoke(
  id: string,
) {
  return this.prisma.userSession.update({
    where: {
      id,
    },
    data: {
      isRevoked: true,
    },
  });
}

async revokeAllByUserId(
  userId: string,
) {
  return this.prisma.userSession.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
    },
  });
}

}