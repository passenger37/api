import { IsString } from 'class-validator';

export class UnpinChannelMessageRequest {
  @IsString()
  messageId: string;
}
