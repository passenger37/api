import { Injectable, NotFoundException } from '@nestjs/common';
import { ServerMember } from '@prisma/client';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { GetServerMembersRequest } from '../dto/request/get-server-members.request';
import { GetServerMembersResponse } from '../dto/response/get-server-members.response';
import { ServerMemberMapper } from '../mappers/server-member.mapper';
@Injectable()
export class ServerMemberQueryService {
  constructor(private readonly memberRepository: ServerMemberRepository) {}

  async getMember(
    serverId: string,
    userId: string,
  ): Promise<ServerMember | null> {
    return this.memberRepository.findByServerAndUser(serverId, userId);
  }

  async getMemberOrThrow(
    serverId: string,
    userId: string,
  ): Promise<ServerMember> {
    const member = await this.getMember(serverId, userId);

    if (!member) {
      throw new NotFoundException('Server member not found.');
    }

    return member;
  }

  async countMembers(serverId: string): Promise<number> {
    return this.memberRepository.countMembers(serverId);
  }

  async getMembers(
    serverId: string,
    request: GetServerMembersRequest,
  ): Promise<GetServerMembersResponse> {
    const page = request.page ?? 1;

    const limit = request.limit ?? 20;

    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.memberRepository.findMembers(serverId, request.query, skip, limit),

      this.memberRepository.countSearchMembers(serverId, request.query),
    ]);

    return {
      items: ServerMemberMapper.toResponseList(members),

      page,

      limit,

      total,

      totalPages: Math.ceil(total / limit),
    };
  }

  async getHighestRole(serverId: string, userId: string) {
    const member = await this.memberRepository.findByServerAndUserWithRoles(
      serverId,
      userId,
    );

    if (!member) {
      throw new NotFoundException('Server member not found.');
    }

    return member.roles.length ? member.roles[0].role : null;
  }

  async getMemberWithRoles(serverId: string, userId: string) {
    return this.memberRepository.findByServerAndUserWithRoles(serverId, userId);
  }

  async getMemberById(memberId: string) {
    const member = await this.memberRepository.findById(memberId);

    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    return member;
  }
}
