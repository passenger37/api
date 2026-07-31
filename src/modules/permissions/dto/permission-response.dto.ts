import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({
    example: 'cme3b4tq0000n4r8s1x2y3z4',
  })
  id: string;

  @ApiProperty({
    example: 'users.read',
  })
  name: string;

  @ApiProperty({
    example: 'Allows reading users.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 'users',
  })
  resource: string;

  @ApiProperty({
    example: 'read',
  })
  action: string;

  @ApiProperty({
    example: true,
  })
  isSystem: boolean;

  @ApiProperty({
    example: '2026-07-30T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-07-30T10:00:00.000Z',
  })
  updatedAt: Date;
}
