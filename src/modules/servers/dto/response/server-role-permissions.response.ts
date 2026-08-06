import { ServerPermission } from '@prisma/client';

export class ServerRolePermissionsResponse {
  permissions: ServerPermission[];
}
