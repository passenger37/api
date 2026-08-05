import { ServerPermission } from '@prisma/client';

export const DEFAULT_SERVER_ROLES = [
  {
    name: 'Owner',
    position: 100,
  },
  {
    name: 'Admin',
    position: 90,
  },
  {
    name: 'Moderator',
    position: 80,
  },
  {
    name: 'Member',
    position: 10,
  },
] as const;
