import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CameraOnRequest {
  @ApiProperty()
  @IsUUID()
  callId!: string;
}