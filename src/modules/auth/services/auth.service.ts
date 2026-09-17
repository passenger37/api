import { Injectable, UnauthorizedException } from '@nestjs/common';

import { randomUUID } from 'crypto';

import { UserStatus } from '@prisma/client';

import { UserQueryService } from '../../users/services/user-query.service';
import { UsersService } from '../../users/services/users.service';
import { UserCommandService } from '../../users/services/user-command.service';
import { SessionsService } from '../../sessions/services';

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LogoutDto } from '../dto';
import { RefreshTokenPayload } from '../interfaces/refresh-token-payload.interface';
import { AuthRequestMetadata } from '../interfaces';
import { TokenService } from './token.service';

import { PasswordService } from '../../security/services/password.service';

import { UserFactory } from '../../users/factories/user.factory';

import { AuthorizationAuditService } from './authorization-audit.service';

import { AuthorizationService } from './authorization.service';

import { RoleService } from './role.service';

import { AuditActions } from '../constants/audit-actions';

import { SystemRoles } from '../../../common/constants/system-roles';

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
    private readonly auditService: AuthorizationAuditService,
    private readonly roleService: RoleService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // =====================================================
  // Registration
  // =====================================================

  async register(dto: RegisterDto) {
    const passwordHash = await this.passwordService.hash(dto.password);

    const input = this.userFactory.createForRegistration(dto, passwordHash);

    const user = await this.userCommandService.createForRegistration(input);

    await this.assignDefaultRole(user.id);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  private async assignDefaultRole(userId: string): Promise<void> {
    const defaultRole = await this.roleService
      .findByName(SystemRoles.USER)
      .catch(() => null);

    if (!defaultRole) {
      return;
    }

    await this.roleService
      .assignRole(userId, defaultRole.id)
      .catch(() => undefined);
  }

  // =====================================================
  // Login
  // =====================================================

  async login(dto: LoginDto, metadata?: AuthRequestMetadata) {
    const user = await this.userQueryService.findByIdentifier(dto.identifier);

    if (!user) {
      await this.auditLoginFailure(dto.identifier, metadata, 'USER_NOT_FOUND');

      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.auditLoginFailure(dto.identifier, metadata, 'BAD_PASSWORD');

      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      await this.auditLoginFailure(
        dto.identifier,
        metadata,
        'ACCOUNT_NOT_ACTIVE',
      );

      throw new UnauthorizedException('Account is not active');
    }

    const sessionId = randomUUID();

    const roles = await this.authorizationService.getUserRoles(user.id);

    const accessToken = await this.tokenService.generateAccessToken(user);

    const { token: refreshToken, jti } =
      await this.tokenService.generateRefreshToken(user.id, sessionId);

    await this.sessionsService.create({
      userId: user.id,
      sessionId,
      refreshTokenJti: jti,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceName: metadata?.deviceName,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    });

    await this.usersService.updateLastSeen(user.id);

    await this.auditLoginSuccess(user.id, metadata);

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
        roles,
        isAdmin: roles.includes(SystemRoles.SUPER_ADMIN),
      },
    };
  }

  // =====================================================
  // Refresh Token
  // =====================================================

  async refresh(dto: RefreshTokenDto, metadata?: AuthRequestMetadata) {
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

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      await this.sessionsService.revoke(session.id);

      throw new UnauthorizedException('Account is not active');
    }

    // 4. Generate new access token
    const accessToken = await this.tokenService.generateAccessToken(user);

    // 5. Generate NEW refresh token
    //    This gets a NEW jti
    const { token: refreshToken, jti } =
      await this.tokenService.generateRefreshToken(user.id, session.sessionId);

    // 6. Replace old refresh-token hash (hashed by jti)
    await this.sessionsService.rotateRefreshToken(session.id, jti);

    await this.usersService.updateLastSeen(user.id);

    await this.auditRefresh(user.id, metadata);

    // 7. Return new token pair
    return {
      accessToken,
      refreshToken,
    };
  }

  // =====================================================
  // Logout
  // =====================================================

  async logout(dto: LogoutDto, metadata?: AuthRequestMetadata) {
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

    await this.auditLogout(session.userId, metadata);

    return {
      success: true,
    };
  }

  // =====================================================
  // Logout All
  // =====================================================

  async logoutAll(userId: string, metadata?: AuthRequestMetadata) {
    await this.sessionsService.revokeAllByUserId(userId);

    await this.auditLogoutAll(userId, metadata);

    return {
      success: true,
      message: 'Logged out from all devices successfully.',
    };
  }

  // =====================================================
  // Audit
  // =====================================================

  private async auditLoginSuccess(
    userId: string,
    metadata?: AuthRequestMetadata,
  ) {
    await this.auditService
      .log({
        actorId: userId,
        targetUserId: userId,
        action: AuditActions.LOGIN_SUCCESS,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      })
      .catch(() => undefined);
  }

  private async auditLoginFailure(
    identifier: string,
    metadata?: AuthRequestMetadata,
    reason?: string,
  ) {
    await this.auditService
      .log({
        action: AuditActions.LOGIN_FAILED,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        metadata: {
          identifier,
          reason,
        },
      })
      .catch(() => undefined);
  }

  private async auditRefresh(userId: string, metadata?: AuthRequestMetadata) {
    await this.auditService
      .log({
        actorId: userId,
        targetUserId: userId,
        action: AuditActions.REFRESH,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      })
      .catch(() => undefined);
  }

  private async auditLogout(userId: string, metadata?: AuthRequestMetadata) {
    await this.auditService
      .log({
        actorId: userId,
        targetUserId: userId,
        action: AuditActions.LOGOUT,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      })
      .catch(() => undefined);
  }

  private async auditLogoutAll(userId: string, metadata?: AuthRequestMetadata) {
    await this.auditService
      .log({
        actorId: userId,
        targetUserId: userId,
        action: AuditActions.LOGOUT_ALL,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      })
      .catch(() => undefined);
  }
}
