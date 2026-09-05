import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MuteRequest {
  @ApiProperty()
  @IsUUID()
  callId!: string;
}