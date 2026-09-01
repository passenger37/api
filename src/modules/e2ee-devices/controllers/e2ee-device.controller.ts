import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RegisterDeviceRequest } from '../dto/request/register-device.request';
import { RefillOneTimePreKeysRequest } from '../dto/request/refill-one-time-prekeys.request';
import { RotateSignedPreKeyRequest } from '../dto/request/rotate-signed-prekey.request';
import { VerifySafetyNumberRequest, DeviceVerificationStatusRequest } from '../dto/request/safety-number.request';
import {
  serializeE2eeDevice,
  serializeSignedPreKey,
} from '../serializers/e2ee-device.serializer';
import { E2eeDeviceCommandService } from '../services/e2ee-device-command.service';
import { E2eeDeviceQueryService } from '../services/e2ee-device-query.service';
import { E2eeSafetyNumberService } from '../services/e2ee-safety-number.service';
import { E2eeKeyRotationService } from '../services/e2ee-key-rotation.service';

@Controller('e2ee/devices')
export class E2eeDeviceController {
  constructor(
    private readonly commandService: E2eeDeviceCommandService,
    private readonly queryService: E2eeDeviceQueryService,
    private readonly safetyNumberService: E2eeSafetyNumberService,
    private readonly keyRotationService: E2eeKeyRotationService,
  ) {}

  @Post()
  async register(
    @CurrentUser('id') userId: string,
    @Body() request: RegisterDeviceRequest,
  ) {
    const device = await this.commandService.register(userId, request);

    return serializeE2eeDevice(device);
  }

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.queryService.listMyDevices(userId);
  }

  @Patch(':deviceId/signed-prekey')
  async rotateSignedPreKey(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Body() request: RotateSignedPreKeyRequest,
  ) {
    const preKey = await this.commandService.rotateSignedPreKey(
      userId,
      deviceId,
      request,
    );

    return serializeSignedPreKey(preKey);
  }

  @Post(':deviceId/one-time-prekeys')
  async refillOneTimePreKeys(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Body() request: RefillOneTimePreKeysRequest,
  ) {
    return this.commandService.refillOneTimePreKeys(userId, deviceId, request);
  }

  @Post(':deviceId/revoke')
  async revoke(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    await this.commandService.revoke(userId, deviceId);

    return { revoked: true };
  }

  @Post('safety-number/verify')
  async verifySafetyNumber(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifySafetyNumberRequest,
  ) {
    return this.safetyNumberService.verifySafetyNumber(userId, dto);
  }

  @Get('safety-number/status')
  async getVerificationStatus(
    @CurrentUser('id') userId: string,
    @Query() query: DeviceVerificationStatusRequest,
  ) {
    return this.safetyNumberService.getVerificationStatus(
      query.localDeviceId,
      query.remoteDeviceId,
    );
  }

  @Get(':deviceId/rotation-status')
  async getRotationStatus(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.keyRotationService.notifyClientOfNeededRotation(deviceId);
  }
}
