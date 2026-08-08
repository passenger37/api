import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AddMessageReactionRequest {
  @IsUUID()
  messageId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  emoji!: string;
}
