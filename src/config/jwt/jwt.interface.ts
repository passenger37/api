export interface JwtConfiguration {
  accessToken: {
    secret: string;
    expiresIn: string;
  };

  refreshToken: {
    secret: string;
    expiresIn: string;
  };
}
