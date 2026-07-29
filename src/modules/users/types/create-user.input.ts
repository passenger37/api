import { UserStatus } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  username: string;
  displayName: string;
  passwordHash?: string;

  bio?: string;
  avatarUrl?: string;
  status?: UserStatus;
}
