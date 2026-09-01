import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from './logger.config';
import { StructuredLogger } from './structured-logger';

@Global()
@Module({
  imports: [LoggerModule.forRoot(loggerConfig)],
  providers: [StructuredLogger],
  exports: [StructuredLogger],
})
export class AppLoggerModule {}
