import { ApiProperty } from '@nestjs/swagger';

import { FollowStateStatus } from '../../enums/follow-state-status.enum';

export class FollowStateResponse {
  @ApiProperty({
    enum: FollowStateStatus,
  })
  status: FollowStateStatus;
}
