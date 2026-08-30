import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServerVisibility } from '@prisma/client';

export class UpdateServerResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({
    enum: ServerVisibility,
  })
  visibility: ServerVisibility;
}
