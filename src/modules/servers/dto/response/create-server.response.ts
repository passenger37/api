import { ApiProperty } from '@nestjs/swagger';

export class CreateServerResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;
}
