import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { UsersService } from '../../users/services/users.service';
import { SessionsService } from '../../sessions/services';

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LogoutDto } from '../dto';

import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(dto: RegisterDto) {
    const emailExists = await this.usersService.findByEmail(dto.email);

    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    const usernameExists =
      await this.usersService.findByUsername(dto.username);

    if (usernameExists) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
    });

    const { passwordHash: _, ...safeUser } = user;

    return safeUser;
  }

  async login(dto: LoginDto) {
    const user =
      await this.usersService.findByIdentifier(
        dto.identifier,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const sessionId = randomUUID();

    const accessToken =
      await this.tokenService.generateAccessToken(
        user,
      );

    const refreshToken =
      await this.tokenService.generateRefreshToken(
        user.id,
        sessionId,
      );

    await this.sessionsService.create({
      userId: user.id,
      sessionId,
      refreshToken,
      expiresAt: new Date(
        Date.now() +
          7 * 24 * 60 * 60 * 1000,
      ),
      deviceName: 'Unknown',
      userAgent: 'Unknown',
      ipAddress: 'Unknown',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

async refresh(
  dto: RefreshTokenDto,
) {
  const payload =
    await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

  const session =
    await this.sessionsService.verifyRefreshToken(
      payload.sid,
      dto.refreshToken,
    );

  if (session.isRevoked) {
    throw new UnauthorizedException(
      'Session revoked',
    );
  }

  if (session.expiresAt < new Date()) {
    throw new UnauthorizedException(
      'Session expired',
    );
  }

  const user =
    await this.usersService.findById(
      payload.sub,
    );

  if (!user) {
    throw new UnauthorizedException();
  }

  const accessToken =
    await this.tokenService.generateAccessToken(
      user,
    );

  const refreshToken =
    await this.tokenService.generateRefreshToken(
      user.id,
      session.sessionId,
    );

  await this.sessionsService.rotateRefreshToken(
    session.id,
    refreshToken,
  );

  return {
    accessToken,
    refreshToken,
  };
}

async logout(
  dto: LogoutDto,
) {
  const payload =
    await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

  const session =
    await this.sessionsService.findBySessionId(
      payload.sid,
    );

  if (!session) {
    throw new UnauthorizedException(
      'Session not found',
    );
  }

  if (session.isRevoked) {
    return {
      success: true,
    };
  }

  await this.sessionsService.revoke(
    session.id,
  );

  return {
    success: true,
  };
}

async logoutAll(
  userId: string,
) {
  await this.sessionsService.revokeAllByUserId(
    userId,
  );

  return {
    success: true,
    message:
      'Logged out from all devices successfully.',
  };
}
}