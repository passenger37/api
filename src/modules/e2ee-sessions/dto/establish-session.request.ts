import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EstablishSessionRequestDto {
  @IsString()
  @MaxLength(100)
  recipientUserId: string;

  @IsString()
  @MaxLength(100)
  recipientDeviceId: string;

  @IsString()
  @MaxLength(5000)
  senderIdentityKey: string;

  @IsString()
  @MaxLength(5000)
  senderEphemeralKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  senderPrekeyBundleRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  oneTimePrekeyId?: string;
}
