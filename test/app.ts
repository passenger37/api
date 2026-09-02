/**
 * Lecture 40.89 - Messaging E2E Tests.
 *
 * E2E test application bootstrap. Creates a real NestJS application with
 * real PostgreSQL (via DB harness) and real Redis (via Redis harness).
 * This is the entry point for `npm run test:e2e`.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

export async function createTestApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors();

  // Listen on a random available port
  await app.listen(0);
  return app;
}

export async function closeTestApp(
  app: Awaited<ReturnType<typeof createTestApp>>,
) {
  await app.close();
}
