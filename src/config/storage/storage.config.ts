import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.MINIO_ENDPOINT,

  port: Number(process.env.MINIO_PORT),

  accessKey: process.env.MINIO_ACCESS_KEY,

  secretKey: process.env.MINIO_SECRET_KEY,

  bucket: process.env.MINIO_BUCKET,

  region: process.env.MINIO_REGION ?? 'auto',

  forcePathStyle: process.env.MINIO_USE_PATH_STYLE !== 'false',

  publicBaseUrl: process.env.MINIO_PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? null,
}));
