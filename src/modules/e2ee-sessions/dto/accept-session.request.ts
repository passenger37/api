import { IsString, MaxLength, IsOptional } from 'class-validator';

export class AcceptSessionRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MaxLength(5000)
  senderEphemeralPublic: string;

  @IsString()
  @MaxLength(5000)
  senderIdentityKey: string;

  @IsString()
  @MaxLength(5000)
  recipientIdentityKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  oneTimePrekeyPublic?: string;
}
