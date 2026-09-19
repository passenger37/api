import { IsString } from 'class-validator';

export class JoinChannelRequest {
  @IsString()
  channelId!: string;
}
