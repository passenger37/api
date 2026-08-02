import { Request } from 'express';

import { AuthorizationContext } from '../../modules/authorization/domain';

export interface AuthorizedRequest extends Request {
  user: {
    id: string;
  };

  authorization?: AuthorizationContext;
}
