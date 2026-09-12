import { IsString, MaxLength } from 'class-validator';

export class AcceptSessionRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MaxLength(100)
  recipientDeviceId: string;
}
