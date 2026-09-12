-- PostgreSQL Index Strategy â€” Phase 3 (Lecture 40.82)
-- Load-model-driven DB/query optimisation.
--
-- These target the newest scale-phase hot paths surfaced by the 40.80/40.81
-- work (E2EE delivery fan-out and the background-job queue) so the
-- QueryOptimizerService's 'partial' access paths are grounded in real DDL.
-- Like the 40.56 precedent (raw SQL only, invisible to the Prisma client API,
-- manual `prisma migrate deploy` workflow), they are additive partial indexes
-- over the small outstanding subsets of large tables.

-- 1. E2EE delivery queue pickup. The delivery worker polls PENDING rows per
--    target device ordered by nextRetryAt; a partial index confines the hot
--    outstanding subset instead of scanning the whole table.
CREATE INDEX IF NOT EXISTS "E2eeDeliveryQueue_pending_pickup_idx"
  ON "e2ee_delivery_queue" ("targetDeviceId", "status", "nextRetryAt")
  WHERE "status" = 'PENDING';

-- 2. E2EE envelope pending pickup. Per-recipient polling of PENDING envelopes
--    ordered by createdAt for fan-out delivery; partial index keeps it small.
CREATE INDEX IF NOT EXISTS "E2eeEnvelope_pending_pickup_idx"
  ON "e2ee_envelopes" ("recipientDeviceId", "status", "createdAt")
  WHERE "status" = 'PENDING';

-- 3. Background job ready-to-run pickup. Workers poll per queue for jobs that
--    are due to run; partial index over the ready subset avoids scanning
--    completed/failed rows.
CREATE INDEX IF NOT EXISTS "BackgroundJob_ready_pickup_idx"
  ON "background_jobs" ("queueName", "status", "scheduledAt")
  WHERE "status" IN ('PENDING', 'QUEUED');
