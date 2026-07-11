import { INestApplication, VersioningType } from '@nestjs/common';

export function configureVersioning(app: INestApplication): void {
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
}
