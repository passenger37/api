import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class MessageSearchQuery {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  authorMemberId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  after?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
