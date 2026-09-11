import { IsString } from 'class-validator';

export class DmTypingStopRequest {
  @IsString()
  channelId: string;
}
