import appConfig from './app/app.config';
import databaseConfig from './database/database.config';
import { jwtConfig } from './jwt';
import redisConfig from './redis/redis.config';
import sessionConfig from './session/session.config';
import storageConfig from './storage/storage.config';

export default [
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  sessionConfig,
  storageConfig,
];
