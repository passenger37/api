import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeMetadataCommandService } from '../services/e2ee-metadata-command.service';
import { E2eeMetadataQueryService } from '../services/e2ee-metadata-query.service';
import { CreateSealedSenderKeyDto, CreatePirRequestDto, UpdateMetadataPolicyDto } from '../dto/metadata.request';

@ApiTags('E2EE Metadata Minimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/metadata')
export class E2eeMetadataController {
  constructor(
    private readonly commandService: E2eeMetadataCommandService,
    private readonly queryService: E2eeMetadataQueryService,
  ) {}

  @Post('sealed-sender-keys')
  @ApiOperation({ summary: 'Create a sealed sender key for a device' })
  async createSealedSenderKey(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSealedSenderKeyDto,
  ) {
    return this.commandService.createSealedSenderKey(userId, dto);
  }

  @Get('sealed-sender-keys')
  @ApiOperation({ summary: 'Get all sealed sender keys for the current user' })
  async getSealedSenderKeys(@CurrentUser('id') userId: string) {
    return this.queryService.getSealedSenderKeys(userId);
  }

  @Post('pir/request')
  @ApiOperation({ summary: 'Create a PIR request for key bundle fetching' })
  async createPirRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePirRequestDto,
  ) {
    return this.commandService.createPirRequest(userId, dto);
  }

  @Get('pir/requests')
  @ApiOperation({ summary: 'Get pending PIR requests for a device' })
  async getPirRequests(
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.queryService.getPirRequests(userId, deviceId);
  }

  @Get('pir/request/:requestId')
  @ApiOperation({ summary: 'Get PIR request by ID' })
  async getPirRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.queryService.getPirRequestById(userId, requestId);
  }

  @Post('pir/request/:requestId/respond')
  @ApiOperation({ summary: 'Respond to a PIR request (server-side)' })
  async respondToPirRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
    @Body('encryptedResponse') encryptedResponse: string,
  ) {
    return this.commandService.respondToPirRequest(requestId, encryptedResponse);
  }

  @Post('policy')
  @ApiOperation({ summary: 'Update metadata policy' })
  async updateMetadataPolicy(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMetadataPolicyDto,
  ) {
    return this.commandService.updateMetadataPolicy(userId, dto);
  }

  @Get('policy')
  @ApiOperation({ summary: 'Get metadata policy' })
  async getMetadataPolicy(@CurrentUser('id') userId: string) {
    return this.queryService.getMetadataPolicy(userId);
  }

  @Post('pad-envelope')
  @ApiOperation({ summary: 'Calculate padding for envelope' })
  async padEnvelope(
    @CurrentUser('id') userId: string,
    @Body('plaintextLength') plaintextLength: number,
  ) {
    return this.commandService.padEnvelope(userId, plaintextLength);
  }

  @Post('batch-delivery')
  @ApiOperation({ summary: 'Batch envelopes for delivery to hide timing' })
  async batchDelivery(
    @CurrentUser('id') userId: string,
    @Body('envelopeIds') envelopeIds: string[],
  ) {
    return this.commandService.batchDelivery(envelopeIds);
  }
}