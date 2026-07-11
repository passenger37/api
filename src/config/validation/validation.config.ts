import { INestApplication, ValidationPipe } from '@nestjs/common';

export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
      forbidUnknownValues: true,
    }),
  );
}
