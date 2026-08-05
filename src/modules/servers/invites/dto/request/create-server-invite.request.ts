import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateServerInviteRequest {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInHours?: number;

  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;
}
