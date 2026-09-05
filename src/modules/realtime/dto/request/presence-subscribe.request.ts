import { IsUUID } from 'class-validator';

export class PresenceSubscribeRequest {
  @IsUUID()
  userId!: string;
}
