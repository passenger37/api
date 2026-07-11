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


@Module({
  imports: [
    PassportModule,
    UsersModule,
    SessionsModule,

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

  controllers: [AuthController],

  providers: [AuthService, TokenService, JwtStrategy],

  exports: [
    AuthService,
    JwtModule,
  ],
})
export class AuthModule {}