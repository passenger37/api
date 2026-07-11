import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Nexus',

  env: process.env.NODE_ENV ?? 'development',

  port: Number(process.env.PORT ?? 3000),

  apiPrefix: process.env.API_PREFIX ?? 'api',

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}));
