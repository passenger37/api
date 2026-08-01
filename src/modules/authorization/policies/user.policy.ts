import { Injectable } from '@nestjs/common';

import { AuthorizationPolicy } from './authorization-policy.interface';

@Injectable()
export class UserPolicy implements AuthorizationPolicy {
  async can(context: {
    currentUserId: string;
    targetUserId: string;
    isAdmin: boolean;
  }): Promise<boolean> {
    if (context.isAdmin) return true;

    return context.currentUserId === context.targetUserId;
  }
}
