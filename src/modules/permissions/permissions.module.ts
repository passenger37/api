import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

import { PermissionFactory } from './factories';

import { PermissionValidationService } from './services';
import { PermissionDomainService } from './services';

@Module({
  providers: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
  ],

  exports: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
  ],
})
export class PermissionsModule {}
