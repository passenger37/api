import { Module } from '@nestjs/common';

import { PermissionsService } from './services';

@Module({
  providers: [
    PermissionsService,
  ],

  exports: [
    PermissionsService,
  ],
})
export class PermissionsModule {}