import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({
    example: 'cmel2u1m70000l0o8q8b7x4r5',
    description: 'Unique role identifier',
  })
  id: string;

  @ApiProperty({
    example: 'Admin',
    description: 'Unique role name',
  })
  name: string;

  @ApiProperty({
    example: 'System administrator role',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: true,
    description: 'Indicates whether this is a protected system role',
  })
  isSystem: boolean;

  @ApiProperty({
    example: '2026-07-30T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-07-30T10:30:00.000Z',
  })
  updatedAt: Date;
}
