import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveReportRequest {
  @ApiProperty({ enum: ['RESOLVED', 'DISMISSED'] })
  @IsIn(['RESOLVED', 'DISMISSED'])
  status: 'RESOLVED' | 'DISMISSED';

  @ApiPropertyOptional({ maxLength: 2000, description: 'Resolution note.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
