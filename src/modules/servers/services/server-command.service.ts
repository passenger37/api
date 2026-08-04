import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { CreateServerRequest } from '../dto/request/create-server.request';
import { CreateServerResponse } from '../dto/response/create-server.response';

import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';

import { ServerValidationService } from './server-validation.service';
import { ServerSlugService } from './server-slug.service';

import { ServerTemplateFactory } from '../factories/server-template.factory';

import { ServerMapper } from '../mappers/server.mapper';
import { ServerStructureService } from './server-structure.service';

@Injectable()
export class ServerCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServerValidationService,
    private readonly slugService: ServerSlugService,
    private readonly serverRepository: ServerRepository,
    private readonly memberRepository: ServerMemberRepository,
    private readonly roleRepository: ServerRoleRepository,
    private readonly templateFactory: ServerTemplateFactory,
     private readonly serverStructureService: ServerStructureService,
  ) {}

  async createServer(
    ownerId: string,
    request: CreateServerRequest,
  ): Promise<CreateServerResponse> {
    await this.validation.validateCreateServer(
      ownerId,
      request,
    );

    const slug = await this.slugService.generate(
      request.name,
    );

    return this.prisma.$transaction(async (tx) => {
      const server =
        await this.serverRepository.create(
          {
            name: request.name,
            slug,
            description: request.description,
            visibility: request.visibility,

            owner: {
              connect: {
                id: ownerId,
              },
            },
          },
          tx,
        );

      await this.memberRepository.createOwnerMembership(
        server.id,
        ownerId,
        tx,
      );

      await this.roleRepository.createDefaultRoles(
        server.id,
        tx,
      );

const template =
  this.templateFactory.getTemplate(
    request.template,
  );

const structure = template.build();

await this.serverStructureService.createStructure(
  server.id,
  structure,
  tx,
);;

      return ServerMapper.toCreateResponse(server);
    });
  }
}