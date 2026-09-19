import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LeaveCallRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId!: string;
}
