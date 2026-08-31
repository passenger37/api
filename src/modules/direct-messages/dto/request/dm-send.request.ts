import { IsString, MaxLength, MinLength } from 'class-validator';

export class DmSendRequest {
  @IsString()
  channelId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @IsString()
  @MaxLength(100)
  clientMessageId?: string;
}
