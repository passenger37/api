import { ApiProperty } from '@nestjs/swagger';

export class RoleSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    required: false,
  })
  description?: string | null;
}
