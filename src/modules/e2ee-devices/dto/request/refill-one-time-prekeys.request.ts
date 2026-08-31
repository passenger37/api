import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { PreKeyDto } from './pre-key.dto';

export class RefillOneTimePreKeysRequest {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PreKeyDto)
  keys: PreKeyDto[];
}
