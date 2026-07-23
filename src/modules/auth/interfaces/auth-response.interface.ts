export interface AuthResponse {
  accessToken: string;

  refreshToken: string;

  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  };
}
