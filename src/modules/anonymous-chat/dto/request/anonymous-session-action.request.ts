import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnonymousSessionActionRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
