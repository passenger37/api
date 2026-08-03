import { ApiProperty } from '@nestjs/swagger';

import { FollowActionResult } from '../../enums/follow-action-result.enum';

export class FollowActionResponse {
  @ApiProperty({
    enum: FollowActionResult,
  })
  status: FollowActionResult;
}
