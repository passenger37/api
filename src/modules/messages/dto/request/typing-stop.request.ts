import { IsString } from 'class-validator';

export class TypingStopRequest {
  @IsString()
  channelId!: string;
}
