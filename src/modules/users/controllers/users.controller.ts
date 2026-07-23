import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  @ApiBearerAuth('JWT')
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return user;
  }
}
