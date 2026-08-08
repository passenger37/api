import { IsString } from 'class-validator';

export class DeleteChannelMessageRequest {
  @IsString()
  messageId: string;
}
