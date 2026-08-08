import { IsUUID } from 'class-validator';

export class DeleteChannelMessageRequest {
  @IsUUID()
  messageId!: string;
}
