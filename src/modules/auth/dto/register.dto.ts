import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'anand',
    description: 'Username',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_.]+$/)
  username: string;

  @ApiProperty({
    example: 'Anand Singh',
    description: 'DisplayName',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  displayName: string;

  @ApiProperty({
    example: 'anand@example.com',
    description: 'Email or Username',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Password',
  })
  @IsString()
  @Length(8, 100)
  password: string;
}
