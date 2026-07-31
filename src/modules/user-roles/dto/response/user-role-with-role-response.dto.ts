import { ApiProperty } from '@nestjs/swagger';

import { RoleSummaryResponseDto } from '../../dto/response/role-summary-response.dto';

export class UserRoleWithRoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    type: RoleSummaryResponseDto,
  })
  role: RoleSummaryResponseDto;

  @ApiProperty()
  createdAt: Date;
}
