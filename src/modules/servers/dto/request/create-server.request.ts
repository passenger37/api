import { ApiProperty } from '@nestjs/swagger';
import { ServerVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ServerTemplateType } from '../../enums/server-template-type.enum';

export class CreateServerRequest {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  name: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    enum: ServerVisibility,
  })
  @IsEnum(ServerVisibility)
  visibility: ServerVisibility;

  @ApiProperty({
    enum: ServerTemplateType,
  })
  @IsEnum(ServerTemplateType)
  template: ServerTemplateType;
}
