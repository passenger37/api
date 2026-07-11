import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.MINIO_ENDPOINT,

  port: Number(process.env.MINIO_PORT),

  accessKey: process.env.MINIO_ACCESS_KEY,

  secretKey: process.env.MINIO_SECRET_KEY,

  bucket: process.env.MINIO_BUCKET,
}));
