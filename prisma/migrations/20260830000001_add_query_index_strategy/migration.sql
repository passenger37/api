-- PostgreSQL Index Strategy (40.56)
--
-- Targeted, additive indexes for the actual hot query paths. These live in
-- raw SQL only (manual prisma migrate deploy workflow, matching the
-- ChannelMessage.searchVector precedent) because Prisma cannot express
-- partial non-unique indexes; the schema.prisma model stays unchanged and
-- the indexes are invisible to the Prisma client API.

-- 1. Outbox poller. OutboxPublisherService polls every 500ms for PENDING
--    events ordered by createdAt. A partial B-tree over the PENDING subset
--    keeps the queue hot (queries this table far more than any other) and
--    shrinks the working set versus the general (status, createdAt) index.
CREATE INDEX IF NOT EXISTS "OutboxEvent_pending_idx"
  ON "OutboxEvent" ("status", "createdAt")
  WHERE "status" = 'PENDING';

-- 2. Server member list/count. findMembersByServer filters active members
--    (removedAt IS NULL) and orders by joinedAt DESC for offset pagination;
--    the count() path shares the filter. Partial index keeps both index-only.
CREATE INDEX IF NOT EXISTS "ServerMember_active_members_idx"
  ON "ServerMember" ("serverId", "joinedAt" DESC)
  WHERE "removedAt" IS NULL;

-- 3. Moderation queues. The report repositories list reports per server with
--    an optional status filter and cursor (id > :cursor, ORDER BY id ASC).
--    (serverId, status, id) covers the default PENDING queue exactly, and the
--    leading serverId column also serves the unfiltered listing.
CREATE INDEX IF NOT EXISTS "MessageReport_serverId_status_id_idx"
  ON "MessageReport" ("serverId", "status", "id");

CREATE INDEX IF NOT EXISTS "UserReport_serverId_status_id_idx"
  ON "UserReport" ("serverId", "status", "id");