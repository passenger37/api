import { IsUUID } from 'class-validator';

export class TypingStopRequest {
  @IsUUID()
  channelId!: string;
}
