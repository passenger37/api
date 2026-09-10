import { Injectable } from '@nestjs/common';

import { DmCommandService } from './dm-command.service';

@Injectable()
export class SystemDmService {
  constructor(private readonly commandService: DmCommandService) {}

  async send(
    senderId: string,
    targetUserId: string,
    content: string,
    clientMessageId?: string,
  ) {
    const channel = await this.commandService.open(senderId, targetUserId);

    return this.commandService.send(
      channel.id,
      senderId,
      content,
      clientMessageId,
    );
  }
}
