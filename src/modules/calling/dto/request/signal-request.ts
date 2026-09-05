import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignalRequest {
  @ApiProperty()
  @IsUUID()
  callId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payload!: string;
}