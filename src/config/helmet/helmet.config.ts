import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function configureHelmet(app: INestApplication): void {
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
}
