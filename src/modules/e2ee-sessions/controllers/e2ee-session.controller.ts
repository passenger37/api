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
    const senderDeviceId = 'device-from-context'; // TODO: derive from auth context
    return this.command.establishSession(userId, senderDeviceId, dto);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptSession(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptSessionRequestDto,
  ) {
    const recipientDeviceId = 'device-from-context'; // TODO: derive from auth context
    return this.command.acceptSession(recipientDeviceId, dto);
  }

  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.query.getSessionById(sessionId);
  }

  @Get('device/:deviceId')
  async listDeviceSessions(@Param('deviceId') deviceId: string) {
    return this.query.listSessionsForDevice(deviceId);
  }
}
