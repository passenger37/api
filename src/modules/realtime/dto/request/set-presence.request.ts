import { IsEnum, IsOptional } from 'class-validator';

import {
  RealtimePresencePrivacy,
  RealtimePresenceStatus,
} from '../../types/realtime.types';

export class SetPresenceRequest {
  @IsEnum(RealtimePresenceStatus)
  status!: RealtimePresenceStatus;

  @IsOptional()
  @IsEnum(RealtimePresencePrivacy)
  privacy?: RealtimePresencePrivacy;
}
