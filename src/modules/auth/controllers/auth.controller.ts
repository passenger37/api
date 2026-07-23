import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators';
import { Roles } from '../../../common/decorators';
import { Public } from '../../../common/decorators';
import { SystemRole } from '../../../common/constants/system-role.enum';
import { Permissions } from '../../../common/decorators';

import { PermissionsGuard } from '../../../common/guards';

@ApiTags('Authentication')
@ApiBearerAuth('JWT')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login using email or username',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  // @Post('logout-all')
  // @UseGuards(JwtAuthGuard)
  // logoutAll(
  //   @CurrentUser() user: JwtPayload,
  // ) {
  //   return this.authService.logoutAll(user.sub);
  // }

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
}
