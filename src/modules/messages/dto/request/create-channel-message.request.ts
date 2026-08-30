import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChannelMessageRequest {
  @IsString()
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsString()
  parentMessageId?: string;

  @IsOptional()
  @IsString({ each: true })
  attachmentIds?: string[];
}
