import { IsOptional, IsString } from 'class-validator';

export class DmReadRequest {
  @IsString()
  channelId: string;

  @IsOptional()
  @IsString()
  lastReadMessageId?: string;
}
