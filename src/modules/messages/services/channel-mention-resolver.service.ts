import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MentionType, ServerPermission } from '@prisma/client';

import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerRoleQueryService } from '../../servers/services/server-role-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';

import { parseMentions } from '../utils/parse-mentions';

export type ResolvedMention = {
  mentionType: MentionType;

  targetMemberId: string | null;

  targetRoleId: string | null;
};

const MAX_MENTIONS_PER_MESSAGE = 50;

@Injectable()
export class ChannelMentionResolver {
  constructor(
    private readonly memberQueryService: ServerMemberQueryService,

    private readonly roleQueryService: ServerRoleQueryService,

    private readonly permissionService: ServerPermissionService,
  ) {}

  async resolve(
    content: string,
    serverId: string,
    channelId: string,
    userId: string,
  ): Promise<ResolvedMention[]> {
    const tokens = parseMentions(content);

    if (tokens.length > MAX_MENTIONS_PER_MESSAGE) {
      throw new BadRequestException(
        `A message can mention at most ${MAX_MENTIONS_PER_MESSAGE} recipients.`,
      );
    }

    const resolved: ResolvedMention[] = [];
    const seen = new Set<string>();

    for (const token of tokens) {
      if (token.type === 'everyone') {
        const allowed = await this.permissionService.hasPermission(
          serverId,
          userId,
          ServerPermission.MANAGE_MESSAGES,
          channelId,
        );

        if (!allowed) {
          throw new ForbiddenException(
            'You do not have permission to mention @everyone.',
          );
        }

        if (!seen.has('everyone')) {
          seen.add('everyone');
          resolved.push({
            mentionType: MentionType.EVERYONE,
            targetMemberId: null,
            targetRoleId: null,
          });
        }

        continue;
      }

      if (token.type === 'role') {
        const role = await this.roleQueryService.getRoleByName(
          serverId,
          token.name,
        );

        if (!role) {
          continue;
        }

        const key = `role:${role.id}`;

        if (!seen.has(key)) {
          seen.add(key);
          resolved.push({
            mentionType: MentionType.ROLE,
            targetMemberId: null,
            targetRoleId: role.id,
          });
        }

        continue;
      }

      const members = await this.memberQueryService.getMembers(serverId, {
        query: token.name,
        page: 1,
        limit: 50,
      });

      const member = members.items.find(
        (candidate) =>
          candidate.nickname === token.name ||
          candidate.user.username === token.name,
      );

      if (!member) {
        continue;
      }

      const key = `member:${member.id}`;

      if (!seen.has(key)) {
        seen.add(key);
        resolved.push({
          mentionType: MentionType.MEMBER,
          targetMemberId: member.id,
          targetRoleId: null,
        });
      }
    }

    return resolved;
  }
}
