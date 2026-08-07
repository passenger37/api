import { Injectable } from '@nestjs/common';

import { Prisma, ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
@Injectable()
export class ServerChannelPermissionOverwriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerChannelPermissionOverwriteCreateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverChannelPermissionOverwrite.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.ServerChannelPermissionOverwriteUpdateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverChannelPermissionOverwrite.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverChannelPermissionOverwrite.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    return this.prisma.serverChannelPermissionOverwrite.findUnique({
      where: { id },
    });
  }

  async findByChannel(channelId: string) {
    return this.prisma.serverChannelPermissionOverwrite.findMany({
      where: {
        channelId,
      },
      include: {
        role: true,
        member: true,
      },
    });
  }

  async findRoleOverwrite(
    channelId: string,
    roleId: string,
    permission: ServerPermission,
  ) {
    return this.prisma.serverChannelPermissionOverwrite.findFirst({
      where: {
        channelId,
        roleId,
        permission,
      },
    });
  }

  async findMemberOverwrite(
    channelId: string,
    memberId: string,
    permission: ServerPermission,
  ) {
    return this.prisma.serverChannelPermissionOverwrite.findFirst({
      where: {
        channelId,
        memberId,
        permission,
      },
    });
  }

  async deleteRoleOverwrite(
    channelId: string,
    roleId: string,
    permission: ServerPermission,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverChannelPermissionOverwrite.deleteMany({
      where: {
        channelId,
        roleId,
        permission,
      },
    });
  }

  async deleteMemberOverwrite(
    channelId: string,
    memberId: string,
    permission: ServerPermission,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverChannelPermissionOverwrite.deleteMany({
      where: {
        channelId,
        memberId,
        permission,
      },
    });
  }

  async findAllForChannel(channelId: string) {
    return this.prisma.serverChannelPermissionOverwrite.findMany({
      where: {
        channelId,
      },
    });
  }

  async findRoleOverwrites(channelId: string, roleIds: string[]) {
    return this.prisma.serverChannelPermissionOverwrite.findMany({
      where: {
        channelId,
        roleId: {
          in: roleIds,
        },
      },
    });
  }

  async findMemberOverwrites(channelId: string, memberId: string) {
    return this.prisma.serverChannelPermissionOverwrite.findMany({
      where: {
        channelId,
        memberId,
      },
    });
  }
}
