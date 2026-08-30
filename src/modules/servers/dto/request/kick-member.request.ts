import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class KickMemberRequest {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
