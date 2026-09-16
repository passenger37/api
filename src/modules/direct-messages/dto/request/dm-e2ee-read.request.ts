import { IsString, MaxLength } from 'class-validator';

export class DmE2eeReadRequest {
  @IsString()
  @MaxLength(100)
  channelId: string;

  @IsString()
  @MaxLength(100)
  messageId: string;

  @IsString()
  @MaxLength(100)
  readerDeviceId: string;
}