import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { SearchIndexRepository } from './repositories/search-index.repository';
import { MeilisearchEngine } from './services/search-engine.service';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchIndexRepository, MeilisearchEngine, SearchService],
  exports: [SearchService, SearchIndexRepository],
})
export class SearchModule {}
