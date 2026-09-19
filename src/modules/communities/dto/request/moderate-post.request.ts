import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModeratePostRequest {
  @ApiProperty({ enum: ['LOCK', 'UNLOCK', 'HIDE', 'UNHIDE', 'PIN', 'UNPIN'] })
  @IsIn(['LOCK', 'UNLOCK', 'HIDE', 'UNHIDE', 'PIN', 'UNPIN'])
  action: 'LOCK' | 'UNLOCK' | 'HIDE' | 'UNHIDE' | 'PIN' | 'UNPIN';

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Reason for the action.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
