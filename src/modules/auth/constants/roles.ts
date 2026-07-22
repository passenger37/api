export const SYSTEM_ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Full system access',
    isSystem: true,
  },
  {
    name: 'ADMIN',
    description: 'Administrative access',
    isSystem: true,
  },
  {
    name: 'MODERATOR',
    description: 'Moderation access',
    isSystem: true,
  },
  {
    name: 'USER',
    description: 'Default user role',
    isSystem: true,
  },
] as const;