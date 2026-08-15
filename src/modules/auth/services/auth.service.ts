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
import { RefreshTokenPayload } from '../interfaces/refresh-token-payload.interface';
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

    const { token: refreshToken, jti } =
      await this.tokenService.generateRefreshToken(user.id, sessionId);

    await this.sessionsService.create({
      userId: user.id,
      sessionId,
      refreshTokenJti: jti,
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
    // 1. Verify JWT signature + expiration
    let payload: RefreshTokenPayload;

    try {
      payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Verify token against the database session
    const session = await this.sessionsService.verifyRefreshToken(
      payload.sid,
      payload.jti,
    );

    // 3. Get user
    const user = await this.userQueryService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 4. Generate new access token
    const accessToken = await this.tokenService.generateAccessToken(user);

    // 5. Generate NEW refresh token
    //    This gets a NEW jti
    const { token: refreshToken, jti } =
      await this.tokenService.generateRefreshToken(user.id, session.sessionId);

    // 6. Replace old refresh-token hash (hashed by jti)
    await this.sessionsService.rotateRefreshToken(session.id, jti);

    // 7. Return new token pair
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
