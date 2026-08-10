import { registerAs } from '@nestjs/config';

export default registerAs('session', () => ({
  cookie: {
    name: process.env.SESSION_COOKIE_NAME ?? 'nexus_session',

    httpOnly: process.env.SESSION_COOKIE_HTTP_ONLY !== 'false',

    secure: process.env.SESSION_COOKIE_SECURE === 'true',

    sameSite: process.env.SESSION_COOKIE_SAME_SITE ?? 'lax',

    path: process.env.SESSION_COOKIE_PATH ?? '/',

    maxAge: Number(
      process.env.SESSION_COOKIE_MAX_AGE_MS ?? 1000 * 60 * 60 * 24 * 30,
    ),
  },
}));
