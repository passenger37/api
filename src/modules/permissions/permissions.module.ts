import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

import { PermissionFactory } from './factories';

import { PermissionValidationService } from './services';

@Module({
  providers: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
  ],

  exports: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
  ],
})
export class PermissionsModule {}
