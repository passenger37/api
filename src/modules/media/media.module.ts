import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../core/database/prisma.module';
import { MediaQueueService } from './queues/media-queue.service';
import { MediaProcessingService } from './services/media-processing.service';
import { MediaWorkersService } from './queues/media-workers.service';
import { MediaController } from './controllers/media.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
          password: configService.get('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 3,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'media:thumbnail' },
      { name: 'media:transcode' },
      { name: 'media:av-scan' },
      { name: 'media:watermark' },
      { name: 'media:metadata' },
    ),
  ],
  controllers: [MediaController],
  providers: [
    MediaQueueService,
    MediaProcessingService,
    MediaWorkersService,
  ],
  exports: [MediaQueueService, MediaProcessingService],
})
export class MediaModule {}