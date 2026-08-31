-- 40.66 — Session Establishment: E2eeSession table
-- Creates session records for X3DH handshake orchestration

CREATE TABLE "e2ee_sessions" (
    "id" TEXT NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "recipientDeviceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sessionState" TEXT NOT NULL,
    "associatedDataHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "e2ee_sessions_pkey" PRIMARY KEY ("id")
);

-- FK to e2ee_devices (table "User" in Prisma, but device table is e2ee_devices)
ALTER TABLE "e2ee_sessions"
    ADD CONSTRAINT "e2ee_sessions_senderDeviceId_fkey"
    FOREIGN KEY ("senderDeviceId") REFERENCES "e2ee_devices"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "e2ee_sessions"
    ADD CONSTRAINT "e2ee_sessions_recipientDeviceId_fkey"
    FOREIGN KEY ("recipientDeviceId") REFERENCES "e2ee_devices"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint: one session per device pair
CREATE UNIQUE INDEX "e2ee_sessions_senderDeviceId_recipientDeviceId_key"
    ON "e2ee_sessions"("senderDeviceId", "recipientDeviceId");

-- Indexes for active session queries
CREATE INDEX "e2ee_sessions_senderDeviceId_isActive_idx"
    ON "e2ee_sessions"("senderDeviceId", "isActive");

CREATE INDEX "e2ee_sessions_recipientDeviceId_isActive_idx"
    ON "e2ee_sessions"("recipientDeviceId", "isActive");