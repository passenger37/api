import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateServerRoleRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  color?: string;

  @IsOptional()
  hoist?: boolean;

  @IsOptional()
  mentionable?: boolean;
}
