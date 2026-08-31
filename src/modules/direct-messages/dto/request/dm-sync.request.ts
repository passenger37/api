import { IsOptional, IsString } from 'class-validator';

export class DmSyncRequest {
  @IsString()
  channelId: string;

  @IsOptional()
  @IsString()
  lastKnownMessageId?: string;
}
