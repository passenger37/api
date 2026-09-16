import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IceCandidateRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  candidate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sdpMid!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sdpMLineIndex!: string;
}