import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CameraOnRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId!: string;
}