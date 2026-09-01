import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../core/database/prisma.module';
import { BackgroundJobsRepository } from './repositories/jobs.repository';
import { JobsQueueService } from './queues/jobs-queue.service';
import { JobsService } from './services/jobs.service';
import { JobsController } from './controllers/jobs.controller';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
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
      { name: 'jobs:default' },
      { name: 'jobs:high' },
      { name: 'jobs:low' },
      { name: 'jobs:scheduled' },
      { name: 'jobs:webhooks' },
      { name: 'jobs:notifications' },
      { name: 'jobs:cleanup' },
      { name: 'jobs:analytics' },
    ),
  ],
  controllers: [JobsController],
  providers: [
    BackgroundJobsRepository,
    JobsQueueService,
    JobsService,
  ],
  exports: [BackgroundJobsRepository, JobsQueueService, JobsService],
})
export class JobsModule {}