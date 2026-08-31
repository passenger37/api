import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PreKeyDto } from './pre-key.dto';
import { SignedPreKeyDto } from './signed-pre-key.dto';

export class RegisterDeviceRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsIn(['web', 'ios', 'android', 'desktop'])
  platform: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  identityKeyPublic: string;

  @ValidateNested()
  @Type(() => SignedPreKeyDto)
  signedPreKey: SignedPreKeyDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PreKeyDto)
  oneTimePreKeys: PreKeyDto[];
}
