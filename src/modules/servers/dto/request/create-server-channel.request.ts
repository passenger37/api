import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { ChannelType } from '@prisma/client';

export class CreateServerChannelRequest {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ChannelType)
  type: ChannelType;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
