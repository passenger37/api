export class MyProfileResponse {
  id: string;

  email: string;

  username: string;

  displayName: string;

  avatarUrl: string | null;

  coverImageUrl: string | null;

  bio: string | null;

  website: string | null;

  phoneNumber: string | null;

  dateOfBirth: Date | null;

  gender: string | null;

  language: string;

  timezone: string;

  country: string | null;

  state: string | null;

  city: string | null;

  location: string | null;

  isPrivate: boolean;

  isVerified: boolean;

  status: string;

  createdAt: Date;

  updatedAt: Date;
}
