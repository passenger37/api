import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { TraceService } from './trace.service';
import { TraceMiddleware } from './trace.middleware';

@Global()
@Module({
  providers: [TraceService, TraceMiddleware],
  exports: [TraceService],
})
export class TracingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
