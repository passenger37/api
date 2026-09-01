import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeTransportCommandService } from '../services/e2ee-transport-command.service';
import { E2eeTransportQueryService } from '../services/e2ee-transport-query.service';
import { SendEnvelopeRequestDto } from '../dto/envelope.request';
import { GetEnvelopesRequestDto } from '../dto/envelope.request';

@ApiTags('E2EE Transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/transport')
export class E2eeTransportController {
  constructor(
    private readonly commandService: E2eeTransportCommandService,
    private readonly queryService: E2eeTransportQueryService,
  ) {}

  @Post('envelopes')
  @ApiOperation({ summary: 'Send an encrypted envelope for a session' })
  async sendEnvelope(
    @CurrentUser('id') userId: string,
    @Body() dto: SendEnvelopeRequestDto,
  ) {
    return this.commandService.sendEnvelope(userId, dto);
  }

  @Post('envelopes/batch')
  @ApiOperation({ summary: 'Send multiple encrypted envelopes for a session' })
  async sendEnvelopesBatch(
    @CurrentUser('id') userId: string,
    @Body('sessionId') sessionId: string,
    @Body('envelopes') envelopes: SendEnvelopeRequestDto[],
  ) {
    return this.commandService.sendEnvelopesForSession(userId, sessionId, envelopes);
  }

  @Get('envelopes/pending')
  @ApiOperation({ summary: 'Get pending envelopes for a recipient device' })
  async getPendingEnvelopes(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.getPendingEnvelopes(deviceId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('envelopes/session/:sessionId')
  @ApiOperation({ summary: 'Get envelopes for a session' })
  async getEnvelopesBySession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
    @Query() query: GetEnvelopesRequestDto,
  ) {
    return this.queryService.getEnvelopesBySession(userId, { ...query, sessionId });
  }

  @Get('envelopes/pending/count')
  @ApiOperation({ summary: 'Count pending envelopes for a device' })
  async countPendingEnvelopes(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.queryService.countPending(deviceId);
  }

  @Post('envelopes/:envelopeId/delivered')
  @ApiOperation({ summary: 'Mark an envelope as delivered' })
  async markDelivered(
    @CurrentUser('id') userId: string,
    @Param('envelopeId') envelopeId: string,
  ) {
    return this.commandService.markDelivered(envelopeId);
  }

  @Post('envelopes/:envelopeId/failed')
  @ApiOperation({ summary: 'Mark an envelope as failed' })
  async markFailed(
    @CurrentUser('id') userId: string,
    @Param('envelopeId') envelopeId: string,
    @Body('error') error: string,
  ) {
    return this.commandService.markFailed(envelopeId, error);
  }
}