import { Module } from '@nestjs/common';

import { ServersModule } from '../servers/servers.module';

import { FeedController } from './controllers/feed.controller';

import { FeedService } from './services/feed.service';

import { FeedRepository } from './repositories/feed.repository';

@Module({
  imports: [ServersModule],

  controllers: [FeedController],

  providers: [FeedService, FeedRepository],
})
export class FeedModule {}
