import { IsUUID } from 'class-validator';

export class JoinChannelRequest {
  @IsUUID()
  channelId!: string;
}
