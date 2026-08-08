import { IsUUID } from 'class-validator';

export class LeaveChannelRequest {
  @IsUUID()
  channelId!: string;
}
