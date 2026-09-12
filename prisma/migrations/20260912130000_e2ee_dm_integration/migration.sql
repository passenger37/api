-- E2EE DM integration
-- * DirectMessageMode enum + channel mode for STANDARD vs PRIVATE_E2EE transport
-- * DirectMessage E2EE metadata (senderDeviceId, isE2ee, protocolVersion); content stays empty for E2EE rows
-- * E2eeSession becomes a public metadata row (sessionState/associatedDataHash nullable, never written)
-- * E2eeEnvelope gains DM link columns
-- * E2eeRatchetState dropped: all ratchet/root/chain key cryptography is client-side

CREATE TYPE "DirectMessageMode" AS ENUM ('STANDARD', 'PRIVATE_E2EE');

ALTER TABLE "DirectMessageChannel" ADD COLUMN "mode" "DirectMessageMode" NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "DirectMessage" ADD COLUMN "senderDeviceId" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "isE2ee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DirectMessage" ADD COLUMN "protocolVersion" INTEGER;

ALTER TABLE "e2ee_sessions" ALTER COLUMN "sessionState" DROP NOT NULL;
ALTER TABLE "e2ee_sessions" ALTER COLUMN "associatedDataHash" DROP NOT NULL;
ALTER TABLE "e2ee_sessions" ADD COLUMN "acceptedAt" TIMESTAMP(3);

ALTER TABLE "e2ee_envelopes" ADD COLUMN "protocolVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "e2ee_envelopes" ADD COLUMN "channelId" TEXT;
ALTER TABLE "e2ee_envelopes" ADD COLUMN "clientMessageId" TEXT;
CREATE INDEX "e2ee_envelopes_channelId_idx" ON "e2ee_envelopes"("channelId");

DROP TABLE IF EXISTS "e2ee_ratchet_states";