import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EstablishSessionRequestDto {
  @IsString()
  @MaxLength(100)
  senderDeviceId: string;

  @IsString()
  @MaxLength(100)
  recipientUserId: string;

  @IsString()
  @MaxLength(100)
  recipientDeviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  oneTimePrekeyId?: string;
}
