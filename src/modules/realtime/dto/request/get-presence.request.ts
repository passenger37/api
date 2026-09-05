import { IsUUID } from 'class-validator';

export class GetPresenceRequest {
  @IsUUID()
  userId!: string;
}
