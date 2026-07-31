import { Module } from '@nestjs/common';

import { RolePermissionsRepository } from './repositories';

@Module({
  providers: [RolePermissionsRepository],

  exports: [RolePermissionsRepository],
})
export class RolePermissionsModule {}
