import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServerVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateServerRequest {
  @ApiPropertyOptional({
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @ApiPropertyOptional({
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({
    enum: ServerVisibility,
  })
  @IsOptional()
  @IsEnum(ServerVisibility)
  visibility?: ServerVisibility;
}
