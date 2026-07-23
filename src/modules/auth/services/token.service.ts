import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';

import { User } from '@prisma/client';

import { JwtPayload, RefreshTokenPayload } from '../interfaces';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessToken.secret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.accessToken.expiresIn',
      ) as SignOptions['expiresIn'],
    });
  }

  async generateRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshToken.secret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.refreshToken.expiresIn',
      ) as SignOptions['expiresIn'],
    });
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.configService.getOrThrow<string>('jwt.refreshToken.secret'),
    });
  }
}
