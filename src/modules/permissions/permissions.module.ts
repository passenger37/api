import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

import { PermissionFactory } from './factories';

import { PermissionValidationService } from './services';
import { PermissionDomainService } from './services';
import { PermissionQueryService } from './services';
import { PermissionCommandService } from './services/permission-command.service';

import { PermissionsController } from './controllers';

@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
    PermissionQueryService,
    PermissionCommandService,
    PermissionsService,
  ],

  exports: [
    PermissionsService,
    PermissionValidationService,
    PermissionsRepository,
    PermissionFactory,
    PermissionDomainService,
    PermissionQueryService,
    PermissionCommandService,
    PermissionsService,
  ],
})
export class PermissionsModule {}
