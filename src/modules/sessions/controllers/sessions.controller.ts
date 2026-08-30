import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators';

import { SessionsService } from '../services';

import { SessionMapper } from '../mappers/session.mapper';

@ApiTags('Sessions')
@ApiBearerAuth('JWT')
@Controller({
  path: 'sessions',
  version: '1',
})
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List active sessions for the current user',
  })
  async list(@CurrentUser() user: { id: string }) {
    const sessions = await this.sessionsService.listSessionsByUser(user.id);

    return sessions.map(SessionMapper.toResponse);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke an active session for the current user',
  })
  async revoke(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionsService.revokeSessionIfOwned(user.id, sessionId);

    return {
      success: true,
    };
  }
}
