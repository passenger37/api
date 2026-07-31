import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

@Module({
  providers: [PermissionsService, PermissionsRepository],

  exports: [PermissionsService, PermissionsRepository],
})
export class PermissionsModule {}
