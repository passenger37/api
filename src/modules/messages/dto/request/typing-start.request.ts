import { IsString } from 'class-validator';

export class TypingStartRequest {
  @IsString()
  channelId!: string;
}
