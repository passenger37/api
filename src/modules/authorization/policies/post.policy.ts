import { Injectable } from '@nestjs/common';
import { AuthorizationPolicy } from './authorization-policy.interface';

@Injectable()
export class PostPolicy implements AuthorizationPolicy {
  async can(context: {
    authorId: string;
    currentUserId: string;
    moderator: boolean;
  }): Promise<boolean> {
    if (context.moderator) return true;

    return context.authorId === context.currentUserId;
  }
}
