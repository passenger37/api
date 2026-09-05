import { IsUUID } from 'class-validator';

export class TypingStartRequest {
  @IsUUID()
  channelId!: string;
}
