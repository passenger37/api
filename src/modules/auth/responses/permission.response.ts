export interface PermissionResponse {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignedRolePermissionResponse {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}
