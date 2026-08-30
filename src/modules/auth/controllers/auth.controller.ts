import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators';
import { Roles } from '../../../common/decorators';
import { Public } from '../../../common/decorators';
import { SystemRole } from '../../../common/constants/system-role.enum';
import { Permissions } from '../../../common/decorators';
import { Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PermissionsGuard } from '../../../common/guards';
import { AuthRateLimit } from '../decorators/auth-rate-limit.decorator';
import { AuthRateLimitGuard } from '../guards/auth-rate-limit.guard';
import { AuthRequestMetadata } from '../interfaces';

@ApiTags('Authentication')
@ApiBearerAuth('JWT')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
  })
  @AuthRateLimit('register')
  @UseGuards(AuthRateLimitGuard)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login using email or username',
  })
  @AuthRateLimit('login')
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const result = await this.authService.login(
      dto,
      this.metadataFrom(request),
    );

    const cookie = this.configService.get('session.cookie');

    response.cookie(cookie.name, result.sessionId, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return result;
  }

  @Public()
  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const result = await this.authService.logout(
      dto,
      this.metadataFrom(request),
    );

    const cookie = this.configService.get('session.cookie');

    response.clearCookie(cookie.name, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
    });

    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    await this.authService.logoutAll(user.id, this.metadataFrom(request));

    const cookie = this.configService.get('session.cookie');

    response.clearCookie(cookie.name, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
    });

    return {
      message: 'Logged out from all devices',
    };
  }

  @Get('profile')
  @UseGuards(PermissionsGuard)
  @Permissions('profile.read')
  profile(
    @CurrentUser() user: { sub: string; email: string; username: string },
  ) {
    return user;
  }
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  findAllUsers() {
    return 'hi';
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('refresh')
  @UseGuards(AuthRateLimitGuard)
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto, this.metadataFrom(request));
  }

  private metadataFrom(request: Request): AuthRequestMetadata {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
