import { IsUUID } from 'class-validator';

export class PresenceUnsubscribeRequest {
  @IsUUID()
  userId!: string;
}
