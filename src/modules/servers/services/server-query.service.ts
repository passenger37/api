import { Injectable, NotFoundException } from '@nestjs/common';

import { Server } from '@prisma/client';

import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { SearchServersRequest } from '../dto/request/search-servers.request';
import { SearchServersResponse } from '../dto/response/search-servers.response';
@Injectable()
export class ServerQueryService {
  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly memberRepository: ServerMemberRepository,
  ) {}

  /**
   * Returns server or null.
   */
  async getById(serverId: string): Promise<Server | null> {
    return this.serverRepository.findById(serverId);
  }

  /**
   * Returns server or null.
   */
  async getBySlug(slug: string): Promise<Server | null> {
    return this.serverRepository.findBySlug(slug);
  }

  /**
   * Throws when server does not exist.
   */
  async getByIdOrThrow(serverId: string): Promise<Server> {
    const server = await this.getById(serverId);

    if (!server) {
      throw new NotFoundException('Server not found.');
    }

    return server;
  }

  /**
   * Throws when slug is invalid.
   */
  async getBySlugOrThrow(slug: string): Promise<Server> {
    const server = await this.getBySlug(slug);

    if (!server) {
      throw new NotFoundException('Server not found.');
    }

    return server;
  }

  /**
   * Lightweight existence check.
   */
  async exists(serverId: string): Promise<boolean> {
    return (await this.getById(serverId)) !== null;
  }

  async search(request: SearchServersRequest): Promise<SearchServersResponse> {
    const page = request.page ?? 1;

    const limit = request.limit ?? 20;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.serverRepository.search(request.query, skip, limit),

      this.serverRepository.countSearchResults(request.query),
    ]);

    return {
      items,

      page,

      limit,

      total,

      totalPages: Math.ceil(total / limit),
    };
  }
}
