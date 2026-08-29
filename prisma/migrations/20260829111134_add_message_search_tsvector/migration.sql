-- Message Search Part 1 (Basic): Postgres full-text search.
--
-- Adds a GENERATED tsvector column over ChannelMessage.content plus a GIN
-- index so `searchVector @@ plainto_tsquery('english', :q)` is index-backed.
--
-- The column is intentionally NOT declared in schema.prisma: Prisma cannot
-- express GENERATED ALWAYS AS expression storage, so the migration is raw SQL
-- only (matching our manual prisma migrate deploy workflow). The Prisma client
-- never reads/writes this column; all access is via $queryRaw in
-- channel-message.repository.

ALTER TABLE "ChannelMessage"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE("content", '')))
  STORED;

CREATE INDEX "ChannelMessage_searchVector_idx"
  ON "ChannelMessage" USING GIN ("searchVector");