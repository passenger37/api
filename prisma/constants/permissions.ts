export const PERMISSIONS = [
  {
    name: 'posts.create',
    resource: 'posts',
    action: 'create',
    description: 'Create posts',
  },

  {
    name: 'posts.update',
    resource: 'posts',
    action: 'update',
    description: 'Update posts',
  },

  {
    name: 'posts.delete',
    resource: 'posts',
    action: 'delete',
    description: 'Delete posts',
  },

  {
    name: 'comments.create',
    resource: 'comments',
    action: 'create',
    description: 'Create comments',
  },

  {
    name: 'comments.delete',
    resource: 'comments',
    action: 'delete',
    description: 'Delete comments',
  },

  {
    name: 'users.update',
    resource: 'users',
    action: 'update',
    description: 'Update users',
  },

  {
    name: 'users.ban',
    resource: 'users',
    action: 'ban',
    description: 'Ban users',
  },

  {
    name: 'reports.review',
    resource: 'reports',
    action: 'review',
    description: 'Review reports',
  },

  {
    name: 'admin.dashboard',
    resource: 'admin',
    action: 'dashboard',
    description: 'Access admin dashboard',
  },
] as const;

export const ROLE_PERMISSIONS = {
  USER: [
    'posts.create',
    'comments.create',
  ],

  MODERATOR: [
    'posts.delete',
    'comments.delete',
    'reports.review',
  ],

  ADMIN: [
    'posts.delete',
    'users.update',
    'users.ban',
    'reports.review',
    'admin.dashboard',
  ],

  SUPER_ADMIN: PERMISSIONS.map(
    permission => permission.name,
  ),
} as const;