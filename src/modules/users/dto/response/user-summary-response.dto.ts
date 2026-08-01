import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  avatarUrl?: string | null;
}
