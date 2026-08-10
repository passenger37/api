import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  APP_NAME: Joi.string().required(),

  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),

  PORT: Joi.number().default(3000),

  API_PREFIX: Joi.string().default('api'),

  FRONTEND_URL: Joi.string().uri().required(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),

  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().required(),

  REDIS_PORT: Joi.number().required(),

  // Storage
  MINIO_ENDPOINT: Joi.string().required(),

  MINIO_PORT: Joi.number().required(),

  MINIO_ACCESS_KEY: Joi.string().required(),

  MINIO_SECRET_KEY: Joi.string().required(),

  MINIO_BUCKET: Joi.string().required(),

  SESSION_COOKIE_NAME: Joi.string().default('nexus_session'),

  SESSION_COOKIE_HTTP_ONLY: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(true),

  SESSION_COOKIE_SECURE: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),

  SESSION_COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),

  SESSION_COOKIE_PATH: Joi.string().default('/'),

  SESSION_COOKIE_MAX_AGE_MS: Joi.number()
    .integer()
    .positive()
    .default(2592000000),
});
