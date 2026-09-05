import { ApiProperty } from '@nestjs/swagger';

export class StunTurnConfigResponse {
  @ApiProperty()
  iceServers!: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
}