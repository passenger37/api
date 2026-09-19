import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  candidate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sdpMid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sdpMLineIndex?: string;
}
