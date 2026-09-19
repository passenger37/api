import { IsString, MaxLength, MinLength } from 'class-validator';

export class DmReactionRestRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  emoji: string;
}