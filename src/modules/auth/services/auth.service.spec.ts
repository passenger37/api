import { UnauthorizedException } from '@nestjs/common';

import { UserStatus } from '@prisma/client';

import { UserQueryService } from '../../users/services/user-query.service';
import { UsersService } from '../../users/services/users.service';
import { UserCommandService } from '../../users/services/user-command.service';
import { SessionsService } from '../../sessions/services';
import { PasswordService } from '../../security/services/password.service';
import { TokenService } from './token.service';
import { UserFactory } from '../../users/factories/user.factory';
import { AuthorizationAuditService } from './authorization-audit.service';
import { AuditActions } from '../constants/audit-actions';
import { AuthService } from './auth.service';
import { AuthorizationService } from './authorization.service';
import { RoleService } from './role.service';

describe('AuthService', () => {
  const usersService = {
    updateLastSeen: jest.fn(),
    getUserRoles: jest.fn().mockResolvedValue([]),
  } as unknown as UsersService;

  const userQueryService = {
    findByIdentifier: jest.fn(),
    findById: jest.fn(),
  } as unknown as UserQueryService;

  const passwordService = {
    verify: jest.fn(),
    hash: jest.fn(),
  } as unknown as PasswordService;

  const tokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  } as unknown as TokenService;

  const sessionsService = {
    create: jest.fn(),
    verifyRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revoke: jest.fn(),
    findBySessionId: jest.fn(),
    revokeAllByUserId: jest.fn(),
  } as unknown as SessionsService;

  const userFactory = {
    createForRegistration: jest.fn(),
  } as unknown as UserFactory;

  const userCommandService = {
    createForRegistration: jest.fn(),
  } as unknown as UserCommandService;

  const auditService = {
    log: jest.fn(),
  } as unknown as AuthorizationAuditService;

  const roleService = {
    findByName: jest.fn(),
    assignRole: jest.fn(),
  } as unknown as RoleService;

  const authorizationService = {
    getUserRoles: jest.fn().mockResolvedValue([]),
  } as unknown as AuthorizationService;

  const service = new AuthService(
    usersService,
    userQueryService,
    passwordService,
    tokenService,
    sessionsService,
    userFactory,
    userCommandService,
    auditService,
    roleService,
    authorizationService,
  );

  const activeUser = {
    id: 'user-1',
    email: 'user@example.com',
    username: 'user',
    displayName: 'User',
    avatarUrl: null,
    passwordHash: 'hash',
    status: UserStatus.ACTIVE,
    deletedAt: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    (auditService.log as jest.Mock).mockResolvedValue({});
    (passwordService.verify as jest.Mock).mockResolvedValue(true);
    (authorizationService.getUserRoles as jest.Mock).mockResolvedValue([]);
  });

  describe('register', () => {
    it('assigns the default USER role after creating the account', async () => {
      (userFactory.createForRegistration as jest.Mock).mockReturnValue({
        email: 'user@example.com',
        username: 'user',
        displayName: 'User',
        passwordHash: 'hash',
      });
      (userCommandService.createForRegistration as jest.Mock).mockResolvedValue(
        activeUser,
      );
      (roleService.findByName as jest.Mock).mockResolvedValue({
        id: 'role-user',
        name: 'USER',
      });
      (roleService.assignRole as jest.Mock).mockResolvedValue({});

      const result = await service.register({
        email: 'user@example.com',
        username: 'user',
        password: 'Password@123',
        displayName: 'User',
      });

      expect(roleService.findByName).toHaveBeenCalledWith('USER');
      expect(roleService.assignRole).toHaveBeenCalledWith(
        'user-1',
        'role-user',
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 'user-1', email: 'user@example.com' }),
      );
    });
  });

  describe('login', () => {
    it('rejects a suspended or deleted account before issuing tokens', async () => {
      (userQueryService.findByIdentifier as jest.Mock).mockResolvedValue({
        ...activeUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({ identifier: 'user', password: 'Password@123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionsService.create).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActions.LOGIN_FAILED,
          metadata: expect.objectContaining({ reason: 'ACCOUNT_NOT_ACTIVE' }),
        }),
      );
    });

    it('records failed login attempts', async () => {
      (userQueryService.findByIdentifier as jest.Mock).mockResolvedValue(
        activeUser,
      );
      (passwordService.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { identifier: 'user', password: 'Wrong@123' },
          { ipAddress: '1.2.3.4', userAgent: 'agent' },
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActions.LOGIN_FAILED,
          ipAddress: '1.2.3.4',
          userAgent: 'agent',
          metadata: expect.objectContaining({ reason: 'BAD_PASSWORD' }),
        }),
      );
    });

    it('stores request metadata on the session, updates lastSeenAt and audits success', async () => {
      (userQueryService.findByIdentifier as jest.Mock).mockResolvedValue(
        activeUser,
      );
      (passwordService.verify as jest.Mock).mockResolvedValue(true);
      (tokenService.generateAccessToken as jest.Mock).mockResolvedValue(
        'access-token',
      );
      (tokenService.generateRefreshToken as jest.Mock).mockResolvedValue({
        token: 'refresh-token',
        jti: 'jti-1',
      });
      (sessionsService.create as jest.Mock).mockResolvedValue({});
      (usersService.updateLastSeen as jest.Mock).mockResolvedValue(activeUser);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.login(
        { identifier: 'user', password: 'Password@123' },
        { ipAddress: '1.2.3.4', userAgent: 'agent' },
      );

      expect(sessionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          ipAddress: '1.2.3.4',
          userAgent: 'agent',
        }),
      );
      expect(usersService.updateLastSeen).toHaveBeenCalledWith('user-1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          action: AuditActions.LOGIN_SUCCESS,
          ipAddress: '1.2.3.4',
        }),
      );
      expect(result).toEqual({
        sessionId: expect.any(String),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({ id: 'user-1' }),
      });
    });
  });

  describe('refresh', () => {
    it('rotates tokens for an active user', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        sub: 'user-1',
        sid: 'sid-1',
        jti: 'jti-1',
      });
      (sessionsService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        id: 'row-1',
        sessionId: 'sid-1',
      });
      (userQueryService.findById as jest.Mock).mockResolvedValue(activeUser);
      (tokenService.generateAccessToken as jest.Mock).mockResolvedValue(
        'new-access-token',
      );
      (tokenService.generateRefreshToken as jest.Mock).mockResolvedValue({
        token: 'new-refresh-token',
        jti: 'jti-2',
      });
      (sessionsService.rotateRefreshToken as jest.Mock).mockResolvedValue({});
      (usersService.updateLastSeen as jest.Mock).mockResolvedValue(activeUser);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.refresh(
        { refreshToken: 'token' },
        { ipAddress: '1.2.3.4', userAgent: 'agent' },
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(sessionsService.rotateRefreshToken).toHaveBeenCalledWith(
        'row-1',
        'jti-2',
      );
      expect(usersService.updateLastSeen).toHaveBeenCalledWith('user-1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditActions.REFRESH }),
      );
    });

    it('revokes the session and rejects a suspended user refresh', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        sub: 'user-1',
        sid: 'sid-1',
        jti: 'jti-1',
      });
      (sessionsService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        id: 'row-1',
        sessionId: 'sid-1',
      });
      (userQueryService.findById as jest.Mock).mockResolvedValue({
        ...activeUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.refresh({ refreshToken: 'token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionsService.revoke).toHaveBeenCalledWith('row-1');
      expect(sessionsService.rotateRefreshToken).not.toHaveBeenCalled();
    });
  });
});
