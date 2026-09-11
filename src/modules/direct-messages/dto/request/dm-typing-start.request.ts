import { IsString } from 'class-validator';

export class DmTypingStartRequest {
  @IsString()
  channelId: string;
}
