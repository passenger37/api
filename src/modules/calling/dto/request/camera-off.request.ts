import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CameraOffRequest {
  @ApiProperty()
  @IsUUID()
  callId!: string;
}