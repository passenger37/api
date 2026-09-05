import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LeaveCallRequest {
  @ApiProperty()
  @IsUUID()
  callId!: string;
}