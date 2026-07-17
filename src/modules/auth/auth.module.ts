import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import type { SignOptions } from 'jsonwebtoken';
import { TokenService } from './services/token.service';

import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SessionsModule } from '../sessions/sessions.module';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsModule } from '../permissions';
import { AuthorizationService } from './services/authorization.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { AuthorizationAuditService } from './services/authorization-audit.service';

import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';

import { SuperAdminGuard } from '../../common/guards/super-admin.guard'

@Module({
  imports: [
    PassportModule,
    UsersModule,
    SessionsModule,
    PermissionsModule,

    JwtModule.registerAsync({
     inject: [ConfigService],

  useFactory: (configService: ConfigService) => (
    
    {
    secret: configService.getOrThrow<string>(
      'jwt.accessToken.secret',
    ),

    signOptions: {
      expiresIn: configService.getOrThrow(
        'jwt.accessToken.expiresIn',
      ) as SignOptions['expiresIn'],
    },
  }),
}),
  ],

  controllers: [AuthController, RoleController, PermissionController],

  providers: [AuthService, TokenService, JwtStrategy,    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },AuthorizationService,
    RoleService,
    PermissionService,
    AuthorizationAuditService,
    SuperAdminGuard,],

  exports: [
    AuthService,
    JwtModule,
    AuthorizationService,
    RoleService,
    PermissionService,
  ],
})
export class AuthModule {}