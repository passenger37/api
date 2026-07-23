import { AuthorizationPermission } from './authorization-permission.interface';

export interface AuthorizationRole {
  id: string;

  name: string;

  permissions: AuthorizationPermission[];
}
