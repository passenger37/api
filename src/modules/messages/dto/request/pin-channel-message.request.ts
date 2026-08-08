import { IsUUID } from 'class-validator';

export class PinChannelMessageRequest {
  @IsUUID()
  messageId!: string;
}
