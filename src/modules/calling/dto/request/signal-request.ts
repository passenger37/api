import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignalRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
