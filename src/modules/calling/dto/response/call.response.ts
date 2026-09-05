import { ApiProperty } from '@nestjs/swagger';
import { CallStatus, CallType, CallScope } from '../../types/calling.types';

export class CallResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CallType })
  type!: CallType;

  @ApiProperty({ enum: CallScope })
  scope!: CallScope;

  @ApiProperty()
  scopeRef!: string;

  @ApiProperty()
  creatorUserId!: string;

  @ApiProperty({ enum: CallStatus })
  status!: CallStatus;

  @ApiProperty({ required: false })
  startedAt?: Date;

  @ApiProperty({ required: false })
  endedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}