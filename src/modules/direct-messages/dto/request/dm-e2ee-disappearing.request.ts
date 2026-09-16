import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class DmE2eeDisappearingSettingsRequest {
  @IsString()
  @MaxLength(100)
  channelId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ttlSeconds?: number;
}