import { Prisma } from '@prisma/client';

import { ServerMemberResponse } from '../dto/response/server-member.response';

type ServerMemberWithUser = Prisma.ServerMemberGetPayload<{
  include: {
    user: true;
  };
}>;

export class ServerMemberMapper {
  static toResponse(member: ServerMemberWithUser): ServerMemberResponse {
    return {
      id: member.id,

      nickname: member.nickname,

      joinedAt: member.joinedAt,

      user: {
        id: member.user.id,

        username: member.user.username,

        displayName: member.user.displayName,

        avatarUrl: member.user.avatarUrl,
      },
    };
  }

  static toResponseList(
    members: ServerMemberWithUser[],
  ): ServerMemberResponse[] {
    return members.map((member) => this.toResponse(member));
  }
}
