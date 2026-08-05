import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateServerRoleRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  hoist?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionable?: boolean;
}
