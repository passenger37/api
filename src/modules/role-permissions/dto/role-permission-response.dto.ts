import { ApiProperty } from '@nestjs/swagger';

export class RolePermissionResponseDto {
  @ApiProperty({
    example: 'clxrp123456',
  })
  id: string;

  @ApiProperty({
    example: 'clxrole123',
  })
  roleId: string;

  @ApiProperty({
    example: 'clxpermission123',
  })
  permissionId: string;

  @ApiProperty({
    example: '2026-07-31T10:30:00.000Z',
  })
  createdAt: Date;
}
