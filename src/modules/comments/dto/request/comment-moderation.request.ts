import { ApiProperty } from '@nestjs/swagger';

export class CommentModerationRequest {
  @ApiProperty() reason!: string;
}