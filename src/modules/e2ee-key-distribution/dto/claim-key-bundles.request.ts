import {
  IsArray,
  ValidateNested,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClaimRequestItemDto {
  @IsString()
  deviceId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  count: number;
}

export class ClaimKeyBundlesRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimRequestItemDto)
  claims: ClaimRequestItemDto[];
}
