import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
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

  @ApiProperty({
    nullable: true,
  })
  coverPhotoUrl: string | null;

  @ApiProperty({
    nullable: true,
  })
  bio: string | null;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
