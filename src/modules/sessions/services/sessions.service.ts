import * as bcrypt from 'bcrypt';

import { Injectable } from '@nestjs/common';

import { SessionsRepository } from '../repositories';

import { CreateSessionDto } from '../dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async create(dto: CreateSessionDto) {
    const refreshTokenHash =
      await bcrypt.hash(dto.refreshToken, 10);

 return this.sessionsRepository.create({

    sessionId: dto.sessionId,

    user: {
      connect: {
        id: dto.userId,
      },
    },

    refreshTokenHash,

    expiresAt: dto.expiresAt,

    deviceName: dto.deviceName,

    userAgent: dto.userAgent,

    ipAddress: dto.ipAddress,
  });
  }

  async findByUserId(userId: string) {
  return this.sessionsRepository.findByUserId(userId);
}

async updateRefreshToken(
  sessionId: string,
  refreshToken: string,
  expiresAt: Date,
) {
  const hash = await bcrypt.hash(
    refreshToken,
    10,
  );

  return this.sessionsRepository.updateRefreshToken(
    sessionId,
    hash,
    expiresAt,
  );
}

async findBySessionId(
  sessionId: string,
) {
  return this.sessionsRepository.findBySessionId(
    sessionId,
  );
}

async rotateRefreshToken(
  sessionId: string,
  refreshToken: string,
) {
  const refreshTokenHash =
    await bcrypt.hash(refreshToken, 10);

  return this.sessionsRepository.update(
    sessionId,
    {
      refreshTokenHash,
      lastUsedAt: new Date(),
    },
  );
}

}