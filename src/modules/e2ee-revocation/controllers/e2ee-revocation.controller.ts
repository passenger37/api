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
import { E2eeRevocationCommandService } from '../services/e2ee-revocation-command.service';
import { E2eeRevocationQueryService } from '../services/e2ee-revocation-query.service';
import { RevokeDeviceRequest, AcknowledgeRevocationRequest, GetRevocationsRequest } from '../dto/revocation.request';

@ApiTags('E2EE Revocation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/revocation')
export class E2eeRevocationController {
  constructor(
    private readonly commandService: E2eeRevocationCommandService,
    private readonly queryService: E2eeRevocationQueryService,
  ) {}

  @Post('revoke')
  @ApiOperation({ summary: 'Revoke a device' })
  async revokeDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: RevokeDeviceRequest,
  ) {
    return this.commandService.revokeDevice(userId, dto);
  }

  @Post('acknowledge')
  @ApiOperation({ summary: 'Acknowledge a device revocation' })
  async acknowledgeRevocation(
    @CurrentUser('id') userId: string,
    @Body() dto: AcknowledgeRevocationRequest,
  ) {
    return this.commandService.acknowledgeRevocation(userId, dto);
  }

  @Post('replacement')
  @ApiOperation({ summary: 'Request replacement device for revoked device' })
  async requestReplacement(
    @CurrentUser('id') userId: string,
    @Body('revokedDeviceId') revokedDeviceId: string,
    @Body('replacementDeviceId') replacementDeviceId: string,
  ) {
    return this.commandService.requestReplacement(userId, revokedDeviceId, replacementDeviceId);
  }

  @Get()
  @ApiOperation({ summary: 'Get revocations for user' })
  async getRevocations(
    @CurrentUser('id') userId: string,
    @Query() query: GetRevocationsRequest,
  ) {
    return this.queryService.getRevocations(userId, query);
  }

  @Get(':revocationId')
  @ApiOperation({ summary: 'Get revocation by ID' })
  async getRevocation(
    @CurrentUser('id') userId: string,
    @Param('revocationId') revocationId: string,
  ) {
    return this.queryService.getRevocationById(userId, revocationId);
  }
}