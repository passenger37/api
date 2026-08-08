import { IsUUID } from 'class-validator';

export class GetMessageReactionsRequest {
  @IsUUID()
  messageId: string;
}
