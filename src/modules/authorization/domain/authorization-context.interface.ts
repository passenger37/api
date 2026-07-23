import { AuthorizationRole } from './authorization-role.interface';

export interface AuthorizationContext {
  userId: string;

  status: string;

  roles: AuthorizationRole[];
}
