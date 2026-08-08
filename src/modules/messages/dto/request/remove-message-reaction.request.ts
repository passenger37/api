import { IsString, IsNotEmpty } from 'class-validator';

export class RemoveMessageReactionRequest {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;
}
