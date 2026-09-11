import { IsString, MaxLength, MinLength } from 'class-validator';

export class DmReactionRequest {
  @IsString()
  messageId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  emoji: string;
}
