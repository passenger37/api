import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnmuteRequest {
  @ApiProperty()
  @IsUUID()
  callId!: string;
}