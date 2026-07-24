import { INestApplication } from '@nestjs/common';

export function configureCors(app: INestApplication): void {
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });
}
