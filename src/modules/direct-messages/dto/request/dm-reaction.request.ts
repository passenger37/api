import { IsString, MaxLength, MinLength } from 'class-validator';

export class DmReactionRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  emoji: string;
}
