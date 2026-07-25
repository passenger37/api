import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiParam
} from '@nestjs/swagger';

import {
  PublicUserProfileDto,
  UserResponseDto,
} from '../responses';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { UsersService } from '../services/users.service';


import  { Public } from '../../../common/decorators/public.decorator';
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  async getCurrentUser(@CurrentUser() user: { id: string }) {
    return this.usersService.getCurrentUser(user.id);
  }

@Get('profile/:username')
@ApiOperation({
  summary: 'Get public user profile',
})
@ApiParam({
  name: 'username',
  description: 'User username',
  example: 'anandsingh',
})
@ApiOkResponse({
  type: PublicUserProfileDto,
})
@ApiNotFoundResponse({
  description: 'User not found.',
})
@Public()
async getPublicProfile(
  @Param('username')
  username: string,
) {
  console.log('PROFILE:', username);
  return this.usersService.getPublicProfile(
    username,
  );
}

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
  })
  @ApiOkResponse({
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async getUserById(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ) {
    return this.usersService.getUserById(id);
  }
}
