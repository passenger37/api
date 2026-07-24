import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from './user-response.dto';

export class CurrentUserDto extends UserResponseDto {
  @ApiProperty()
  email: string;

  @ApiProperty({
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiProperty({
    nullable: true,
  })
  dateOfBirth: Date | null;

  @ApiProperty({
    nullable: true,
  })
  gender: string | null;

  @ApiProperty({
    nullable: true,
  })
  country: string | null;

  @ApiProperty({
    nullable: true,
  })
  state: string | null;

  @ApiProperty({
    nullable: true,
  })
  city: string | null;

  @ApiProperty()
  language: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty({
    nullable: true,
  })
  lastSeenAt: Date | null;
}
