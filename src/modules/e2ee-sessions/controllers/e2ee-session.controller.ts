import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeSessionCommandService } from '../services/e2ee-session-command.service';
import { E2eeSessionQueryService } from '../services/e2ee-session-query.service';
import { EstablishSessionRequestDto } from '../dto/establish-session.request';
import { AcceptSessionRequestDto } from '../dto/accept-session.request';

@Controller('e2ee/sessions')
export class E2eeSessionController {
  constructor(
    private readonly command: E2eeSessionCommandService,
    private readonly query: E2eeSessionQueryService,
  ) {}

  @Post('establish')
  @HttpCode(HttpStatus.OK)
  async establishSession(
    @CurrentUser('id') userId: string,
    @Body() dto: EstablishSessionRequestDto,
  ) {
    return this.command.establishSession(userId, dto);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptSession(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptSessionRequestDto,
  ) {
    return this.command.acceptSession(userId, dto);
  }

  @Get(':sessionId')
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.query.getSessionById(sessionId, userId);
  }

  @Get('device/:deviceId')
  async listDeviceSessions(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.query.listSessionsForDevice(deviceId, userId);
  }
}
