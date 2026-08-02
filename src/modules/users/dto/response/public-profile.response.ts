export class PublicProfileResponse {
  id!: string;

  username!: string;

  displayName!: string;

  avatarUrl!: string | null;

  coverImageUrl!: string | null;

  bio!: string | null;

  website!: string | null;

  country!: string | null;

  state!: string | null;

  city!: string | null;

  isVerified!: boolean;

  createdAt!: Date;
}
