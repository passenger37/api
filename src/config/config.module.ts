import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { validationSchema } from './validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      cache: true,

      expandVariables: true,

      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],

      load: 
        configuration,
      validationSchema,
    }),
  ],

  exports: [ConfigModule],
})
export class AppConfigModule {}