import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
    @ApiOperation({
    summary: 'Register a new user',
  })
  register(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @Post('login')
    @ApiOperation({
    summary: 'Login using email or username',
  })
login(
  @Body() dto: LoginDto,
) {
  return this.authService.login(dto);
}

@Post('logout')
logout(
  @Body() dto: LogoutDto,
) {
  return this.authService.logout(dto);
}

}