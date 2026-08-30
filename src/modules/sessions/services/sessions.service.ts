import * as bcrypt from 'bcrypt';

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { SessionsRepository } from '../repositories';

import { CreateSessionDto } from '../dto';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async create(dto: CreateSessionDto) {
    const refreshTokenHash = await bcrypt.hash(dto.refreshTokenJti, 10);

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

  async listSessionsByUser(userId: string) {
    return this.sessionsRepository.findAllActiveByUserId(userId);
  }

  async updateRefreshToken(
    sessionId: string,
    refreshTokenJti: string,
    expiresAt: Date,
  ) {
    const hash = await bcrypt.hash(refreshTokenJti, 10);

    return this.sessionsRepository.updateRefreshToken(sessionId, hash);
  }

  async findBySessionId(sessionId: string) {
    return this.sessionsRepository.findBySessionId(sessionId);
  }

  async rotateRefreshToken(id: string, refreshTokenJti: string) {
    const refreshTokenHash = await bcrypt.hash(refreshTokenJti, 10);

    return this.sessionsRepository.updateRefreshToken(id, refreshTokenHash);
  }

  async verifyRefreshToken(sessionId: string, refreshTokenJti: string) {
    const session = await this.findBySessionId(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.isRevoked) {
      throw new UnauthorizedException('Session revoked');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const matches = await bcrypt.compare(
      refreshTokenJti,
      session.refreshTokenHash,
    );

    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return session;
  }
  async revoke(id: string) {
    return this.sessionsRepository.revoke(id);
  }

  async revokeSessionIfOwned(userId: string, sessionId: string) {
    const session = await this.sessionsRepository.findBySessionId(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user.id !== userId) {
      throw new UnauthorizedException('Cannot revoke this session');
    }

    return this.sessionsRepository.revoke(session.id);
  }

  async revokeAllByUserId(userId: string) {
    return this.sessionsRepository.revokeAllByUserId(userId);
  }
}
