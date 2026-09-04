import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { CreateServerRequest } from '../dto/request/create-server.request';
import { CreateServerResponse } from '../dto/response/create-server.response';
import { UpdateServerRequest } from '../dto/request/update-server.request';

import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';

import { ServerValidationService } from './server-validation.service';
import { ServerSlugService } from './server-slug.service';

import { ServerTemplateFactory } from '../factories/server-template.factory';

import { ServerMapper } from '../mappers/server.mapper';
import { ServerStructureService } from './server-structure.service';
import { ServerRoleService } from './server-role.service';
import { ServerPermissionService } from './server-permission.service';

import { SearchService } from '../../search/services/search.service';

@Injectable()
export class ServerCommandService {
  private readonly logger = new Logger(ServerCommandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServerValidationService,
    private readonly slugService: ServerSlugService,
    private readonly serverRepository: ServerRepository,
    private readonly templateFactory: ServerTemplateFactory,
    private readonly serverStructureService: ServerStructureService,
    private readonly serverRoleService: ServerRoleService,
    private readonly serverMemberRepository: ServerMemberRepository,
    private readonly serverRoleRepository: ServerRoleRepository,
    private readonly serverRoleAssignmentRepository: ServerRoleAssignmentRepository,
    private readonly permissionService: ServerPermissionService,
    private readonly searchService: SearchService,
  ) {}

  async createServer(
    ownerId: string,
    request: CreateServerRequest,
  ): Promise<CreateServerResponse> {
    // validation

    const slug = await this.slugService.generate(request.name);

    const server = await this.prisma.$transaction(async (tx) => {
      const server = await this.serverRepository.create(
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

      await this.serverRoleService.createDefaultRoles(server.id, tx);

      await this.serverMemberRepository.createOwnerMembership(
        server.id,
        ownerId,
        tx,
      );

      const ownerMembership =
        await this.serverMemberRepository.findByServerAndUser(
          server.id,
          ownerId,
          tx,
        );

      const ownerRole = await this.serverRoleRepository.findByName(
        server.id,
        'Owner',
        tx,
      );

      if (!ownerMembership || !ownerRole) {
        throw new Error('Failed to initialize owner role.');
      }

      await this.serverRoleAssignmentRepository.create(
        {
          member: {
            connect: {
              id: ownerMembership.id,
            },
          },
          role: {
            connect: {
              id: ownerRole.id,
            },
          },
        },
        tx,
      );

      const template = this.templateFactory.getTemplate(request.template);

      const structure = template.build();

      await this.serverStructureService.createStructure(
        server.id,
        ownerId,
        structure,
        tx,
      );

      return server;
    });

    await this.indexServer(server);

    return ServerMapper.toCreateResponse(server);
  }

  private async indexServer(server: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }) {
    try {
      await this.searchService.indexServer(server.id, {
        name: server.name,
        description: server.description || undefined,
        memberCount: 1,
        createdAt: server.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index server ${server.id} in search: ${(error as Error).message}`,
      );
    }
  }

  async updateServer(
    serverId: string,
    userId: string,
    request: UpdateServerRequest,
  ) {
    const server = await this.serverRepository.findById(serverId);

    if (!server) {
      throw new NotFoundException('Server not found.');
    }

    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.SERVER_UPDATE,
    );

    await this.validation.validateUpdateServer(request);

    const data: Prisma.ServerUpdateInput = {};

    if (request.name !== undefined) {
      data.name = request.name.trim();
    }

    if (request.description !== undefined) {
      data.description = request.description;
    }

    if (request.iconUrl !== undefined) {
      data.iconUrl = request.iconUrl;
    }

    if (request.bannerUrl !== undefined) {
      data.bannerUrl = request.bannerUrl;
    }

    if (request.visibility !== undefined) {
      data.visibility = request.visibility;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to update.');
    }

    const updated = await this.serverRepository.update(serverId, data);

    return ServerMapper.toUpdateResponse(updated);
  }

  async deleteServer(serverId: string, userId: string) {
    const server = await this.serverRepository.findById(serverId);

    if (!server) {
      throw new NotFoundException('Server not found.');
    }

    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.SERVER_DELETE,
    );

    const owner = await this.serverMemberRepository.findOwner(serverId);

    if (!owner || owner.userId !== userId) {
      throw new ForbiddenException(
        'Only the server owner can delete the server.',
      );
    }

    await this.serverRepository.delete(serverId);

    return {
      success: true,
    };
  }
}
