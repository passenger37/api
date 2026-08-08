import { IsUUID } from 'class-validator';

export class UnpinChannelMessageRequest {
  @IsUUID()
  messageId!: string;
}
