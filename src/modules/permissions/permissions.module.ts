import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

import { PermissionsRepository } from './repositories';

import { PermissionFactory } from './factories';

@Module({
  providers: [PermissionsService, PermissionsRepository, PermissionFactory],

  exports: [PermissionsService, PermissionsRepository, PermissionFactory],
})
export class PermissionsModule {}
