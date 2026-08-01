import { Injectable } from '@nestjs/common';

import { UserPolicy } from './user.policy';
import { PostPolicy } from './post.policy';

@Injectable()
export class PolicyFactory {
  constructor(
    readonly userPolicy: UserPolicy,
    readonly postPolicy: PostPolicy,
  ) {}
}
