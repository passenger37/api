import { IsEnum } from 'class-validator';

import { PresenceStatus } from '../../services/presence.service';

export class SetPresenceRequest {
  @IsEnum(PresenceStatus)
  status!: PresenceStatus;
}
