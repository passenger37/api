import { Injectable, UnauthorizedException } from '@nestjs/common';

import { randomUUID } from 'crypto';

import { UserQueryService } from '../../users/services/user-query.service';
import { UsersService } from '../../users/services/users.service';
import { UserCommandService } from '../../users/services/user-command.service';
import { SessionsService } from '../../sessions/services';

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LogoutDto } from '../dto';

import { TokenService } from './token.service';

import { PasswordService } from '../../security/services/password.service';

import { UserFactory } from '../../users/factories/user.factory';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userQueryService: UserQueryService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionsService: SessionsService,
    private readonly userFactory: UserFactory,
    private readonly userCommandService: UserCommandService,
  ) {}

  // =====================================================
  // Registration
  // =====================================================

  async register(dto: RegisterDto) {
    const passwordHash = await this.passwordService.hash(dto.password);

    const input = this.userFactory.createForRegistration(dto, passwordHash);

    const user = await this.userCommandService.createForRegistration(input);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  // =====================================================
  // Login
  // =====================================================

  async login(dto: LoginDto) {
    const user = await this.userQueryService.findByIdentifier(dto.identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();

    const accessToken = await this.tokenService.generateAccessToken(user);

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      sessionId,
    );

    await this.sessionsService.create({
      userId: user.id,
      sessionId,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceName: 'Unknown',
      userAgent: 'Unknown',
      ipAddress: 'Unknown',
    });

    return {
      sessionId,
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

  // =====================================================
  // Refresh Token
  // =====================================================

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

    const session = await this.sessionsService.verifyRefreshToken(
      payload.sid,
      dto.refreshToken,
    );

    if (session.isRevoked) {
      throw new UnauthorizedException('Session revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.userQueryService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    const accessToken = await this.tokenService.generateAccessToken(user);

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      session.sessionId,
    );

    await this.sessionsService.rotateRefreshToken(session.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  // =====================================================
  // Logout
  // =====================================================

  async logout(dto: LogoutDto) {
    const payload = await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

    const session = await this.sessionsService.findBySessionId(payload.sid);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.isRevoked) {
      return {
        success: true,
      };
    }

    await this.sessionsService.revoke(session.id);

    return {
      success: true,
    };
  }

  // =====================================================
  // Logout All
  // =====================================================

  async logoutAll(userId: string) {
    await this.sessionsService.revokeAllByUserId(userId);

    return {
      success: true,
      message: 'Logged out from all devices successfully.',
    };
  }
}
