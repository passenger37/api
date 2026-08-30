import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

import { UserStatus } from '@prisma/client';

import { UserQueryService } from '../../users/services/user-query.service';
import { CurrentUserDto } from '../dto/current-user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userQueryService: UserQueryService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: configService.getOrThrow<string>('jwt.accessToken.secret'),
    });
  }

  async validate(payload: any): Promise<CurrentUserDto> {
    const user = await this.userQueryService.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      sub: user.id,
      email: user.email,
      username: user.username,
      permissionVersion: user.permissionVersion,
    };
  }
}
