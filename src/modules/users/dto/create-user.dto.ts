import {
  IsEmail,
  IsEnum,
  IsOptional,
  Length,
  Matches,
  IsString,
  MinLength,
} from 'class-validator';

import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message:
      'Username may contain only letters, numbers, dots and underscores.',
  })
  username: string;

  @IsString()
  @Length(2, 100)
  displayName: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus = UserStatus.ACTIVE;

  @IsString()
  @MinLength(8)
  password: string;
}
