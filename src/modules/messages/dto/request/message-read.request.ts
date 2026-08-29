import { IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageReadRequest {
  @IsUUID()
  channelId!: string;

  @IsOptional()
  @IsString()
  lastReadMessageId?: string;
}
