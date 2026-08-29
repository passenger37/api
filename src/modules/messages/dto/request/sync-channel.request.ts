import { IsUUID } from 'class-validator';

export class SyncChannelRequest {
  @IsUUID()
  channelId: string;

  @IsUUID()
  lastKnownMessageId: string;
}
