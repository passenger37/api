import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CallScope } from '../../types/calling.types';

export class GetActiveCallRequest {
  @ApiProperty({ enum: CallScope })
  @IsEnum(CallScope)
  scope!: CallScope;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scopeRef!: string;
}