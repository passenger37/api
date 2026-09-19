import { ApiProperty } from '@nestjs/swagger';
import { CallParticipantState } from '../../types/calling.types';

export class CallParticipantResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  callId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ required: false })
  deviceId?: string;

  @ApiProperty()
  joinedAt!: Date;

  @ApiProperty({ required: false })
  leftAt?: Date;

  @ApiProperty({ enum: CallParticipantState })
  state!: CallParticipantState;
}
