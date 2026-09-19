import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetMutedRequest {
  @ApiProperty({
    description: 'Whether to mute notifications for the community.',
  })
  @IsBoolean()
  isMuted: boolean;
}
