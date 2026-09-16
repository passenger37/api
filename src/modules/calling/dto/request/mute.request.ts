import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MuteRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId!: string;
}