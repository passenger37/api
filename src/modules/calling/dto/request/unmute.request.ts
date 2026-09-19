import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnmuteRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId!: string;
}
