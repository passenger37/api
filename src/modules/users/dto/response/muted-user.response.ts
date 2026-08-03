import { ApiProperty } from '@nestjs/swagger';

export class MutedUserResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  mutedAt: Date;
}
