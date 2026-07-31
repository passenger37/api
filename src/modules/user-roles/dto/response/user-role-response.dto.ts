import { ApiProperty } from '@nestjs/swagger';

export class UserRoleResponseDto {
  @ApiProperty({
    example: 'clz123abc456',
  })
  id: string;

  @ApiProperty({
    example: 'user-id',
  })
  userId: string;

  @ApiProperty({
    example: 'role-id',
  })
  roleId: string;

  @ApiProperty({
    example: '2026-07-31T14:30:00.000Z',
  })
  createdAt: Date;
}
