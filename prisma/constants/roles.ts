export const SYSTEM_ROLES = [
  {
    name: 'USER',
    description: 'Default user',
    isSystem: true,
  },

  {
    name: 'MODERATOR',
    description: 'Community moderator',
    isSystem: true,
  },

  {
    name: 'ADMIN',
    description: 'Application administrator',
    isSystem: true,
  },

  {
    name: 'SUPER_ADMIN',
    description: 'Platform owner',
    isSystem: true,
  },
] as const;