import { JwtPayload } from 'jsonwebtoken';

export interface RefreshTokenPayload extends JwtPayload {
  sub: string; // user ID
  sid: string; // session ID
  jti: string; // unique refresh-token ID
}
