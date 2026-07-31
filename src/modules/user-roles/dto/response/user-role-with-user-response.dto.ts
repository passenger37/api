import { ApiProperty } from '@nestjs/swagger';

import { UserSummaryResponseDto } from '../response/user-summary-response.dto';

export class UserRoleWithUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    type: UserSummaryResponseDto,
  })
  user: UserSummaryResponseDto;

  @ApiProperty()
  createdAt: Date;
}
