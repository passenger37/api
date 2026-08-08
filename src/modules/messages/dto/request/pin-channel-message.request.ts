import { IsString } from 'class-validator';

export class PinChannelMessageRequest {
  @IsString()
  messageId: string;
}
