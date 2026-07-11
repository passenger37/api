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
});
