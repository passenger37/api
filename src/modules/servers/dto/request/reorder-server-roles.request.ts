import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class RolePositionDto {
  @IsString()
  roleId: string;

  @IsInt()
  position: number;
}

export class ReorderServerRolesRequest {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RolePositionDto)
  roles: RolePositionDto[];
}
