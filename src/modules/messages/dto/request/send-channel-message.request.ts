import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendChannelMessageRequest {
  @IsUUID()
  channelId: string;

  @IsString()
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentMessageId?: string;
}
