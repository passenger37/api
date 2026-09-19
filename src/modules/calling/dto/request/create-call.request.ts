import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CallType, CallScope } from '../../types/calling.types';

export class CreateCallRequest {
  @ApiProperty({ enum: CallType })
  @IsEnum(CallType)
  type!: CallType;

  @ApiProperty({ enum: CallScope })
  @IsEnum(CallScope)
  scope!: CallScope;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scopeRef!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
