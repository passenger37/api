import { IsString, MaxLength } from 'class-validator';

export class UpdateChannelMessageRequest {
  @IsString()
  @MaxLength(4000)
  content: string;
}
