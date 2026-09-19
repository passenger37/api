import { IsString, MaxLength } from 'class-validator';

export class DmE2eeTypingStartRequest {
  @IsString()
  @MaxLength(100)
  channelId: string;

  @IsString()
  @MaxLength(100)
  senderDeviceId: string;
}
