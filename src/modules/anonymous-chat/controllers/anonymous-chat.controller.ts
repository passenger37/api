import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import { AnonymousChatQueryService } from '../services/anonymous-chat.query.service';
import { AnonymousChatStatusResponse } from '../dto/response/anonymous-chat-status.response';

@ApiTags('Anonymous Chat')
@ApiBearerAuth()
@Controller('anonymous-chat')
export class AnonymousChatController {
  constructor(
    private readonly queryService: AnonymousChatQueryService,
    private readonly mapper: AnonymousMapper,
  ) {}

  /**
   * Non-realtime state lookup used by the client to rehydrate the anonymous
   * UI on page load. All mutating operations happen over the `/anonymous`
   * Socket.IO namespace so no duplicate HTTP commands are exposed.
   */
  @Get('status')
  @ApiOperation({ summary: 'Get current anonymous chat state' })
  @ApiResponse({ status: 200, type: AnonymousChatStatusResponse })
  async status(
    @CurrentUser('id') userId: string,
  ): Promise<AnonymousChatStatusResponse> {
    const state = await this.queryService.getCurrentState(userId);

    if (state.kind === 'idle') {
      return { status: 'idle' };
    }

    if (state.kind === 'queued') {
      return {
        status: 'queued',
        sessionId: state.sessionId,
        topic: state.topic,
        displayId: state.displayId,
        queuedAt: state.queuedAt,
      };
    }

    return {
      status: 'active',
      sessionId: state.sessionId,
      roomId: state.roomId,
      topic: state.topic,
      self: this.mapper.toPublicProfile(state.self),
      peer: this.mapper.toPublicProfile(state.peer),
      matchedAt: state.matchedAt,
    };
  }
}
