-- 40.67 — Double Ratchet: E2eeRatchetState table
-- Stores per-session ratchet state for message encryption/decryption

CREATE TABLE "e2ee_ratchet_states" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rootKey" TEXT NOT NULL,
    "sendingChainKey" TEXT NOT NULL,
    "receivingChainKey" TEXT NOT NULL,
    "sendingMessageNumber" INTEGER NOT NULL DEFAULT 0,
    "receivingMessageNumber" INTEGER NOT NULL DEFAULT 0,
    "nextDhPublicKey" TEXT,
    "currentDhPrivateKey" TEXT,
    "previousReceivingChainLength" INTEGER NOT NULL DEFAULT 0,
    "skippedMessageKeys" TEXT NOT NULL DEFAULT '{}',
    "remoteDhPublicKey" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "e2ee_ratchet_states_pkey" PRIMARY KEY ("id")
);

-- FK to e2ee_sessions
ALTER TABLE "e2ee_ratchet_states"
    ADD CONSTRAINT "e2ee_ratchet_states_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "e2ee_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint: one ratchet state per session
CREATE UNIQUE INDEX "e2ee_ratchet_states_sessionId_key"
    ON "e2ee_ratchet_states"("sessionId");