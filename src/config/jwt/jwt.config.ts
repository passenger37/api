import { registerAs } from '@nestjs/config';

import { JWT_CONFIG_KEY } from './jwt.constants';

export default registerAs(JWT_CONFIG_KEY, () => ({
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET!,

    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  },

  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET!,

    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
}));
