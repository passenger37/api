import { IsString } from 'class-validator';

export class DmDeleteRequest {
  @IsString()
  messageId: string;
}
