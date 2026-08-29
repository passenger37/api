import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendChannelMessageRequest {
  @IsUUID()
  channelId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentMessageId?: string;
}
