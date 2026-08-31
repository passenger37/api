import { Injectable } from '@nestjs/common';

import { E2eeDeviceRepository } from '../repositories/e2ee-device.repository';
import { E2eeDeviceResponse } from '../responses';
import { serializeE2eeDevice } from '../serializers/e2ee-device.serializer';

@Injectable()
export class E2eeDeviceQueryService {
  constructor(private readonly deviceRepository: E2eeDeviceRepository) {}

  async listMyDevices(userId: string): Promise<E2eeDeviceResponse[]> {
    const devices = await this.deviceRepository.findByUserId(userId);

    return devices.map(serializeE2eeDevice);
  }
}
