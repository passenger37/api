import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeSessionsModule } from '../e2ee-sessions/e2ee-sessions.module';
import { E2eeRatchetStateRepository } from './repositories/e2ee-ratchet-state.repository';
import { E2eeRatchetCommandService } from './services/e2ee-ratchet-command.service';
import { E2eeRatchetQueryService } from './services/e2ee-ratchet-query.service';
import { E2eeRatchetController } from './controllers/e2ee-ratchet.controller';

@Module({
  imports: [PrismaModule, E2eeSessionsModule],
  controllers: [E2eeRatchetController],
  providers: [
    E2eeRatchetStateRepository,
    E2eeRatchetCommandService,
    E2eeRatchetQueryService,
  ],
  exports: [E2eeRatchetCommandService, E2eeRatchetQueryService],
})
export class E2eeRatchetModule {}
