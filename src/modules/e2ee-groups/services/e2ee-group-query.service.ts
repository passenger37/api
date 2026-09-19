import { Injectable, NotFoundException } from '@nestjs/common';
import { E2eeGroupRepository } from '../repositories/e2ee-group.repository';
import {
  serializeGroup,
  serializeGroupMember,
  serializeGroupEnvelope,
  serializeGroupEnvelopeList,
} from '../serializers/e2ee-group.serializer';
import {
  GetGroupEnvelopesRequest,
  GetGroupMembersRequest,
} from '../dto/group.request';

@Injectable()
export class E2eeGroupQueryService {
  constructor(private readonly groupRepo: E2eeGroupRepository) {}

  async getGroup(userId: string, groupId: string) {
    const group = await this.groupRepo.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    // Check if user is a member
    const membership = await this.groupRepo.findMemberByUser(groupId, userId);
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    return { success: true, group: serializeGroup(group) };
  }

  async getMyGroups(userId: string) {
    const groups = await this.groupRepo.findByCreator(userId);
    return { success: true, groups: groups.map(serializeGroup) };
  }

  async getMembers(userId: string, dto: GetGroupMembersRequest) {
    const group = await this.groupRepo.findById(dto.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const membership = await this.groupRepo.findMemberByUser(
      dto.groupId,
      userId,
    );
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    const members = await this.groupRepo.findMembers(dto.groupId);
    return { success: true, members: members.map(serializeGroupMember) };
  }

  async getPendingEnvelopes(groupId: string, limit = 50) {
    const envelopes = await this.groupRepo.findPendingByGroup(groupId, limit);
    return { success: true, envelopes: serializeGroupEnvelopeList(envelopes) };
  }

  async getEnvelopes(groupId: string, dto: GetGroupEnvelopesRequest) {
    const envelopes = await this.groupRepo.findByGroup(dto.groupId, {
      limit: dto.limit ?? 50,
      cursor: dto.cursor,
    });
    return { success: true, envelopes: serializeGroupEnvelopeList(envelopes) };
  }

  async countPending(groupId: string) {
    const count = await this.groupRepo.countPendingByGroup(groupId);
    return { success: true, count };
  }
}
