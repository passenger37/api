import { IsString } from 'class-validator';

export class DmOpenRequest {
  @IsString()
  targetUserId: string;
}
