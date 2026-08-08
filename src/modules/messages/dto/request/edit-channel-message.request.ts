import { IsString, MaxLength } from 'class-validator';

export class EditChannelMessageRequest {
  @IsString()
  messageId: string;

  @IsString()
  @MaxLength(4000)
  content: string;
}
