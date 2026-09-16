import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CameraOffRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId!: string;
}