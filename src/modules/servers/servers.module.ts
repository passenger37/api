import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersController } from './controllers/servers.controller';

import { ServersService } from './services/servers.service';
import { ServerCommandService } from './services/server-command.service';
import { ServerQueryService } from './services/server-query.service';
import { ServerValidationService } from './services/server-validation.service';
import { ServerSlugService } from './services/server-slug.service';
import { ServerStructureService } from './services/server-structure.service';

import { ServerRepository } from './repositories/server.repository';
import { ServerMemberRepository } from './repositories/server-member.repository';
import { ServerRoleRepository } from './repositories/server-role.repository';
import { ServerCategoryRepository } from './repositories/server-category.repository';
import { ServerChannelRepository } from './repositories/server-channel.repository';

import { ServerTemplateFactory } from './factories/server-template.factory';

import { CodingTemplate } from './factories/templates/coding.template';
import { ClassroomTemplate } from './factories/templates/classroom.template';

@Module({
  imports: [PrismaModule],

  controllers: [ServersController],

  providers: [
    // Services
    ServersService,
    ServerCommandService,
    ServerQueryService,
    ServerValidationService,
    ServerSlugService,
    ServerStructureService,

    // Repositories
    ServerRepository,
    ServerMemberRepository,
    ServerRoleRepository,
    ServerCategoryRepository,
    ServerChannelRepository,

    // Factories
    ServerTemplateFactory,

    // Templates
    CodingTemplate,
    ClassroomTemplate,
  ],

  exports: [
    ServersService,
  ],
})
export class ServersModule {}