import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureValidation } from './config/validation/index';
import { GlobalExceptionFilter } from './common/exceptions/filters/global-exception.filter';
import { StructuredLogger } from './core/logger/structured-logger';
import { configureSwagger } from './config/swagger';
import { configureHelmet } from './config/helmet';
import { configureCors } from './config/cors/index';
import { configureVersioning } from './config/versioning/index';
import { RedisIoAdapter } from './core/redis/redis-io.adapter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.use(cookieParser());

  const redisIoAdapter = new RedisIoAdapter(app.getHttpServer());
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const expressApp = app.getHttpAdapter().getInstance() as any;

  expressApp.set(
    'trust proxy',
    process.env.TRUST_PROXY !== 'false' ? 1 : false,
  );

  configureVersioning(app);
  configureValidation(app);
  configureHelmet(app);
  configureCors(app);
  configureSwagger(app);

  app.useLogger(app.get(Logger));
  // app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(
    new GlobalExceptionFilter(app.get(StructuredLogger)),
  );

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3001);
  console.log('NODE_ENV =', process.env.NODE_ENV);
  console.log('PORT =', process.env.PORT ?? 3001);
  console.log('NODE_ID =', redisIoAdapter.instanceId());

  process.once('SIGINT', async () => {
    await redisIoAdapter.disconnect();
    await app.close();
    process.exit(0);
  });

  process.once('SIGTERM', async () => {
    await redisIoAdapter.disconnect();
    await app.close();
    process.exit(0);
  });
}

bootstrap();
