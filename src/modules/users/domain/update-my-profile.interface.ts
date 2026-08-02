import { Gender } from '@prisma/client';

export interface UpdateMyProfileData {
  displayName?: string;

  bio?: string;

  website?: string;

  phoneNumber?: string;

  dateOfBirth?: Date;

  gender?: Gender;

  language?: string;

  timezone?: string;

  country?: string;

  state?: string;

  city?: string;

  location?: string;

  isPrivate?: boolean;

  avatarUrl?: string;

  coverImageUrl?: string;
}
