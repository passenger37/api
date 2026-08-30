import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

import { PermissionFactory } from './factories';

import { PermissionValidationService } from './services';
import { PermissionDomainService } from './services';
import { PermissionQueryService } from './services';
import { PermissionCommandService } from './services/permission-command.service';

@Module({
  imports: [],
  providers: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
    PermissionQueryService,
    PermissionCommandService,
  ],

  exports: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
    PermissionQueryService,
    PermissionCommandService,
  ],
})
export class PermissionsModule {}
