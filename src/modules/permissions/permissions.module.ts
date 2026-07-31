import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

import { PermissionFactory } from './factories';

import { PermissionValidationService } from './services';
import { PermissionDomainService } from './services';
import {
  PermissionQueryService,
} from './services';

@Module({
  providers: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
    PermissionQueryService,
  ],

  exports: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
    PermissionQueryService,
  ],
})
export class PermissionsModule {}
