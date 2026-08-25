import { IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateChannelMessageRequest {
  @IsUUID()
  messageId: string;

  @IsString()
  @MaxLength(4000)
  content: string;
}
