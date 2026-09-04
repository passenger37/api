import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommunityModeratorRole } from '@prisma/client';

export class ModeratorAssignmentRequest {
  @ApiProperty({ description: 'Target user id.' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: CommunityModeratorRole })
  @IsEnum(CommunityModeratorRole)
  role: CommunityModeratorRole;
}
