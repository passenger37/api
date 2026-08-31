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
import { E2eeRatchetCommandService } from '../services/e2ee-ratchet-command.service';
import { E2eeRatchetQueryService } from '../services/e2ee-ratchet-query.service';
import {
  EncryptRequestDto,
  DecryptRequestDto,
  RatchetStepRequestDto,
} from '../dto/ratchet.request';

@Controller('e2ee/ratchet')
export class E2eeRatchetController {
  constructor(
    private readonly command: E2eeRatchetCommandService,
    private readonly query: E2eeRatchetQueryService,
  ) {}

  @Post('encrypt')
  @HttpCode(HttpStatus.OK)
  async encrypt(
    @CurrentUser('id') userId: string,
    @Body() dto: EncryptRequestDto,
  ) {
    return this.command.encrypt(userId, dto);
  }

  @Post('decrypt')
  @HttpCode(HttpStatus.OK)
  async decrypt(
    @CurrentUser('id') userId: string,
    @Body() dto: DecryptRequestDto,
  ) {
    return this.command.decrypt(userId, dto);
  }

  @Post('step')
  @HttpCode(HttpStatus.OK)
  async ratchetStep(
    @CurrentUser('id') userId: string,
    @Body() dto: RatchetStepRequestDto,
  ) {
    return this.command.ratchetStep(userId, dto);
  }

  @Get(':sessionId/state')
  async getState(@Param('sessionId') sessionId: string) {
    return this.query.getStateForSession(sessionId);
  }
}
