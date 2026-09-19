import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnonymousTypingRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty()
  @IsBoolean()
  isTyping!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientMessageId?: string;
}
