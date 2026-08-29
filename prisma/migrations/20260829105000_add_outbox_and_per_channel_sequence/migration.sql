DROP INDEX "ChannelMessage_eventSeq_key";
-- The eventSeq sequence is OWNED BY ChannelMessage.eventSeq, so it is
-- dropped automatically when the column is dropped.
ALTER TABLE "ChannelMessage" DROP COLUMN "eventSeq";

ALTER TABLE "ServerChannel"
ADD COLUMN "lastMessageSeq" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ChannelMessage"
ADD COLUMN "messageSeq" INTEGER;

UPDATE "ChannelMessage" AS m
SET "messageSeq" = sub.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY "channelId" ORDER BY "createdAt", id) AS rn
  FROM "ChannelMessage"
) AS sub
WHERE m.id = sub.id;

ALTER TABLE "ChannelMessage"
ALTER COLUMN "messageSeq" SET NOT NULL;

CREATE INDEX "ChannelMessage_channelId_messageSeq_idx"
ON "ChannelMessage"("channelId", "messageSeq");

UPDATE "ServerChannel" AS c
SET "lastMessageSeq" = agg.mx
FROM (
  SELECT "channelId", COALESCE(MAX("messageSeq"), 0) AS mx
  FROM "ChannelMessage"
  GROUP BY "channelId"
) AS agg
WHERE c.id = agg."channelId";

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "channelId" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboxEvent_status_createdAt_idx"
ON "OutboxEvent"("status", "createdAt");