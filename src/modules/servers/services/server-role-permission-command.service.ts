import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerRolePermissionRepository } from '../repositories/server-role-permission.repository';

import { ServerPermissionService } from './server-permission.service';

import { ServerHierarchyService } from './server-hierarchy.service';

@Injectable()
export class ServerRolePermissionCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly permissionService: ServerPermissionService,

    private readonly hierarchyService: ServerHierarchyService,

    private readonly rolePermissionRepository: ServerRolePermissionRepository,
  ) {}
}
