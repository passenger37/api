import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ServerPermission, ServerVisibility } from '@prisma/client';

import { ServerCommandService } from './server-command.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';
import { ServerValidationService } from './server-validation.service';
import { ServerSlugService } from './server-slug.service';
import { ServerTemplateFactory } from '../factories/server-template.factory';
import { ServerStructureService } from './server-structure.service';
import { ServerRoleService } from './server-role.service';
import { ServerPermissionService } from './server-permission.service';

describe('ServerCommandService - lifecycle', () => {
  let service: ServerCommandService;
  let prisma: { $transaction: jest.Mock };
  let validation: {
    validateCreateServer: jest.Mock;
    validateUpdateServer: jest.Mock;
  };
  let serverRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let serverMemberRepository: {
    findOwner: jest.Mock;
    findByServerAndUser: jest.Mock;
  };
  let permissionService: { requirePermission: jest.Mock };

  const server = {
    id: 'srv-1',
    slug: 'nexus',
    name: 'Nexus HQ',
    description: 'Community',
    iconUrl: null,
    bannerUrl: null,
    visibility: ServerVisibility.PUBLIC,
    ownerId: 'user-owner',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(undefined)),
    };
    validation = {
      validateCreateServer: jest.fn(),
      validateUpdateServer: jest.fn(),
    };
    serverRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    serverMemberRepository = {
      findOwner: jest.fn(),
      findByServerAndUser: jest.fn(),
    };
    permissionService = { requirePermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerCommandService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServerValidationService, useValue: validation },
        { provide: ServerSlugService, useValue: { generate: jest.fn() } },
        { provide: ServerRepository, useValue: serverRepository },
        {
          provide: ServerTemplateFactory,
          useValue: { getTemplate: jest.fn() },
        },
        {
          provide: ServerStructureService,
          useValue: { createStructure: jest.fn() },
        },
        {
          provide: ServerRoleService,
          useValue: { createDefaultRoles: jest.fn() },
        },
        { provide: ServerMemberRepository, useValue: serverMemberRepository },
        { provide: ServerRoleRepository, useValue: { findByName: jest.fn() } },
        {
          provide: ServerRoleAssignmentRepository,
          useValue: { create: jest.fn() },
        },
        { provide: ServerPermissionService, useValue: permissionService },
      ],
    }).compile();

    service = module.get(ServerCommandService);
  });

  describe('updateServer', () => {
    it('should require SERVER_UPDATE and persist only provided fields', async () => {
      serverRepository.findById.mockResolvedValue(server);
      permissionService.requirePermission.mockResolvedValue(undefined);
      serverRepository.update.mockResolvedValue({
        ...server,
        name: 'Renamed',
        visibility: ServerVisibility.PRIVATE,
      });

      const result = await service.updateServer('srv-1', 'user-1', {
        name: '  Renamed  ',
        visibility: ServerVisibility.PRIVATE,
      });

      expect(permissionService.requirePermission).toHaveBeenCalledWith(
        'srv-1',
        'user-1',
        ServerPermission.SERVER_UPDATE,
      );
      expect(validation.validateUpdateServer).toHaveBeenCalledWith({
        name: '  Renamed  ',
        visibility: ServerVisibility.PRIVATE,
      });
      expect(serverRepository.update).toHaveBeenCalledWith('srv-1', {
        name: 'Renamed',
        visibility: ServerVisibility.PRIVATE,
      });
      expect(result).toEqual({
        id: 'srv-1',
        slug: 'nexus',
        name: 'Renamed',
        description: 'Community',
        visibility: ServerVisibility.PRIVATE,
      });
    });

    it('should throw NotFound for an unknown server', async () => {
      serverRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateServer('missing', 'user-1', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate Forbidden when missing SERVER_UPDATE', async () => {
      serverRepository.findById.mockResolvedValue(server);
      permissionService.requirePermission.mockRejectedValue(
        new ForbiddenException('Missing permission: SERVER_UPDATE'),
      );

      await expect(
        service.updateServer('srv-1', 'user-1', { description: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject empty updates', async () => {
      serverRepository.findById.mockResolvedValue(server);
      permissionService.requirePermission.mockResolvedValue(undefined);

      await expect(service.updateServer('srv-1', 'user-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteServer', () => {
    it('should delete a server when the caller is the owner', async () => {
      serverRepository.findById.mockResolvedValue(server);
      permissionService.requirePermission.mockResolvedValue(undefined);
      serverMemberRepository.findOwner.mockResolvedValue({
        userId: 'user-owner',
      });
      serverRepository.delete.mockResolvedValue(server);

      const result = await service.deleteServer('srv-1', 'user-owner');

      expect(permissionService.requirePermission).toHaveBeenCalledWith(
        'srv-1',
        'user-owner',
        ServerPermission.SERVER_DELETE,
      );
      expect(serverRepository.delete).toHaveBeenCalledWith('srv-1');
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFound for an unknown server', async () => {
      serverRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteServer('missing', 'user-owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate Forbidden when missing SERVER_DELETE', async () => {
      serverRepository.findById.mockResolvedValue(server);
      permissionService.requirePermission.mockRejectedValue(
        new ForbiddenException('Missing permission: SERVER_DELETE'),
      );

      await expect(service.deleteServer('srv-1', 'user-admin')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should forbid non-owners even with SERVER_DELETE granted', async () => {
      serverRepository.findById.mockResolvedValue(server);
      permissionService.requirePermission.mockResolvedValue(undefined);
      serverMemberRepository.findOwner.mockResolvedValue({
        userId: 'user-owner',
      });

      await expect(service.deleteServer('srv-1', 'user-admin')).rejects.toThrow(
        ForbiddenException,
      );
      expect(serverRepository.delete).not.toHaveBeenCalled();
    });
  });
});
