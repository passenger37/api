export const SYSTEM_PERMISSIONS = [
  // Users
  { name: 'users.read', resource: 'users', action: 'read' },
  { name: 'users.create', resource: 'users', action: 'create' },
  { name: 'users.update', resource: 'users', action: 'update' },
  { name: 'users.delete', resource: 'users', action: 'delete' },

  // Roles
  { name: 'roles.read', resource: 'roles', action: 'read' },
  { name: 'roles.create', resource: 'roles', action: 'create' },
  { name: 'roles.update', resource: 'roles', action: 'update' },
  { name: 'roles.delete', resource: 'roles', action: 'delete' },

  // Permissions
  { name: 'permissions.read', resource: 'permissions', action: 'read' },
  { name: 'permissions.create', resource: 'permissions', action: 'create' },
  { name: 'permissions.update', resource: 'permissions', action: 'update' },
  { name: 'permissions.delete', resource: 'permissions', action: 'delete' },

  // Profile
  { name: 'profile.read', resource: 'profile', action: 'read' },
  { name: 'profile.update', resource: 'profile', action: 'update' },
] as const;