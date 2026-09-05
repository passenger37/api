import { IsUUID } from 'class-validator';

export class ChannelLeaveRequest {
  @IsUUID()
  channelId!: string;
}
