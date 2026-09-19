import { ApiProperty } from '@nestjs/swagger';

import { AnonymousPublicProfile } from '../../types/anonymous-chat.types';

export class AnonymousChatStatusResponse {
  @ApiProperty({ enum: ['idle', 'queued', 'active'] })
  status!: 'idle' | 'queued' | 'active';

  @ApiProperty({ required: false, nullable: true })
  sessionId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  roomId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  topic?: string | null;

  @ApiProperty({ required: false, nullable: true })
  displayId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  self?: AnonymousPublicProfile | null;

  @ApiProperty({ required: false, nullable: true })
  peer?: AnonymousPublicProfile | null;

  @ApiProperty({ required: false, nullable: true })
  queuedAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  matchedAt?: string | null;
}
