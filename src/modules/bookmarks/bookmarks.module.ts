import { Module } from '@nestjs/common';
import { BookmarkController } from './controllers/bookmark.controller';
import { BookmarkCommandService } from './services/bookmark-command.service';
import { BookmarkQueryService } from './services/bookmark-query.service';
import { BookmarkCollectionService } from './services/bookmark-collection.service';
import { BookmarkRepository } from './repositories/bookmark.repository';

@Module({
  controllers: [BookmarkController],
  providers: [
    BookmarkRepository,
    BookmarkCommandService,
    BookmarkQueryService,
    BookmarkCollectionService,
  ],
  exports: [
    BookmarkRepository,
    BookmarkQueryService,
    BookmarkCommandService,
    BookmarkCollectionService,
  ],
})
export class BookmarksModule {}
