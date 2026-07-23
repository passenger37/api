import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'anand@example.com',
    description: 'Email or Username',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'User password',
  })
  @IsString()
  @Length(8, 100)
  password: string;
}
