import { Module } from '@nestjs/common';

import { SessionsController } from './controllers';
import { SessionsRepository } from './repositories';
import { SessionsService } from './services';

@Module({
  controllers: [
    SessionsController,
  ],

  providers: [
    SessionsRepository,
    SessionsService,
  ],

  exports: [
    SessionsRepository,
    SessionsService,
  ],
})
export class SessionsModule {}