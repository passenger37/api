CREATE SEQUENCE "ChannelMessage_eventSeq_seq";

ALTER TABLE "ChannelMessage"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "ChannelMessage"
ADD COLUMN "eventSeq" BIGINT NOT NULL DEFAULT nextval('"ChannelMessage_eventSeq_seq"');

ALTER SEQUENCE "ChannelMessage_eventSeq_seq" OWNED BY "ChannelMessage"."eventSeq";

CREATE UNIQUE INDEX "ChannelMessage_eventSeq_key" ON "ChannelMessage"("eventSeq");