import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { KeyDistributionQueryService } from '../services/key-distribution-query.service';
import { KeyDistributionCommandService } from '../services/key-distribution-command.service';
import { ClaimKeyBundlesRequestDto } from '../dto/claim-key-bundles.request';
import { serializeKeyBundle } from '../serializers/key-distribution.serializer';

@Controller('e2ee/key-bundles')
export class KeyDistributionController {
  constructor(
    private readonly query: KeyDistributionQueryService,
    private readonly command: KeyDistributionCommandService,
  ) {}

  @Get(':userId')
  async getKeyBundles(@Param('userId') userId: string) {
    const { devices } = await this.query.getKeyBundles(userId);
    return { devices: devices.map(serializeKeyBundle) };
  }

  @Post(':userId/claim')
  @HttpCode(HttpStatus.OK)
  async claimKeyBundles(
    @CurrentUser('id') callerId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: ClaimKeyBundlesRequestDto,
  ) {
    return this.command.claimKeyBundles(targetUserId, dto);
  }
}
