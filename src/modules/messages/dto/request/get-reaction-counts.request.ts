import { IsUUID } from 'class-validator';

export class GetReactionCountsRequest {
  @IsUUID()
  messageId: string;
}
