import { IsOptional, IsString } from 'class-validator';

export class UpdateChannelReadStateRequest {
  @IsOptional()
  @IsString()
  lastReadMessageId?: string;
}
