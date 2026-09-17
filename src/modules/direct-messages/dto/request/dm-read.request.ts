import { IsOptional, IsString } from 'class-validator';

export class DmReadRequest {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  lastReadMessageId?: string;
}
