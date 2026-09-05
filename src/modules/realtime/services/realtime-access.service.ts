import { Injectable } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';

import { ServerChannelQueryService } from '../../servers/services/server-channel-query.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';

export type RealtimeChannelAccess = {
  channelId: string;
  serverId: string;
  username: string;
};

@Injectable()
export class RealtimeAccessService {
  constructor(
    private readonly channelQueryService: ServerChannelQueryService,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async validateChannelAccess(
    channelId: string,
    userId: string,
  ): Promise<RealtimeChannelAccess> {
    const channel = await this.channelQueryService.getChannelOrThrow(channelId);

    const member = await this.memberQueryService.getMemberWithUser(
      channel.serverId,
      userId,
    );

    await this.permissionService.requirePermission(
      channel.serverId,
      userId,
      ServerPermission.CHANNEL_VIEW,
      channelId,
    );

    return {
      channelId: channel.id,
      serverId: channel.serverId,
      username: member.nickname ?? member.user.username,
    };
  }
}
