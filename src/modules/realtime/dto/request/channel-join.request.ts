import { IsUUID } from 'class-validator';

export class ChannelJoinRequest {
  @IsUUID()
  channelId!: string;
}
