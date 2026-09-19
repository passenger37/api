import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '@prisma/client';

export class CastVoteRequest {
  @ApiProperty({ enum: VoteType, description: 'The vote to apply.' })
  @IsEnum(VoteType)
  vote: VoteType;
}
