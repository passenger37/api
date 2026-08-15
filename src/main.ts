import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureValidation } from './config/validation/index';
import { GlobalExceptionFilter } from './common/exceptions/filters/global-exception.filter';
import { configureSwagger } from './config/swagger';
import { configureHelmet } from './config/helmet';
import { configureCors } from './config/cors/index';
import { configureVersioning } from './config/versioning/index';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.use(cookieParser());
  configureVersioning(app);
  configureValidation(app);
  configureHelmet(app);
  configureCors(app);
  configureSwagger(app);

  app.useLogger(app.get(Logger));
  // app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3001);
  console.log('NODE_ENV =', process.env.NODE_ENV);
  console.log('PORT =', process.env.PORT ?? 3001);
}

bootstrap();
