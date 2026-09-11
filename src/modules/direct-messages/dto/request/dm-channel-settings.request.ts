import { IsBoolean, IsOptional } from 'class-validator';

export class DmChannelSettingsRequest {
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
