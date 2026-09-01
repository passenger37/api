-- CreateTable
CREATE TABLE "e2ee_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creatorUserId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_group_sessions" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 0,
    "iteration" INTEGER NOT NULL DEFAULT 0,
    "chainKey" TEXT NOT NULL,
    "signingKeyPrivate" TEXT,
    "signingKeyPublic" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_group_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_group_envelopes" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "E2eeEnvelopeType" NOT NULL DEFAULT 'SENDER_KEY',
    "ciphertext" TEXT NOT NULL,
    "associatedData" TEXT,
    "senderDeviceId" TEXT NOT NULL,
    "status" "E2eeEnvelopeStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_group_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "e2ee_groups_creatorUserId_idx" ON "e2ee_groups"("creatorUserId");

-- CreateIndex
CREATE INDEX "e2ee_groups_isActive_idx" ON "e2ee_groups"("isActive");

-- CreateIndex
CREATE INDEX "e2ee_group_members_groupId_idx" ON "e2ee_group_members"("groupId");

-- CreateIndex
CREATE INDEX "e2ee_group_members_userId_idx" ON "e2ee_group_members"("userId");

-- CreateIndex
CREATE INDEX "e2ee_group_members_deviceId_idx" ON "e2ee_group_members"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_group_members_groupId_deviceId_key" ON "e2ee_group_members"("groupId", "deviceId");

-- CreateIndex
CREATE INDEX "e2ee_group_sessions_groupId_idx" ON "e2ee_group_sessions"("groupId");

-- CreateIndex
CREATE INDEX "e2ee_group_sessions_deviceId_idx" ON "e2ee_group_sessions"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_group_sessions_groupId_deviceId_key" ON "e2ee_group_sessions"("groupId", "deviceId");

-- CreateIndex
CREATE INDEX "e2ee_group_envelopes_groupId_status_idx" ON "e2ee_group_envelopes"("groupId", "status");

-- CreateIndex
CREATE INDEX "e2ee_group_envelopes_senderDeviceId_idx" ON "e2ee_group_envelopes"("senderDeviceId");

-- CreateIndex
CREATE INDEX "e2ee_group_envelopes_createdAt_idx" ON "e2ee_group_envelopes"("createdAt");

-- AddForeignKey
ALTER TABLE "e2ee_groups" ADD CONSTRAINT "e2ee_groups_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_members" ADD CONSTRAINT "e2ee_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "e2ee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_members" ADD CONSTRAINT "e2ee_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_members" ADD CONSTRAINT "e2ee_group_members_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_sessions" ADD CONSTRAINT "e2ee_group_sessions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "e2ee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_sessions" ADD CONSTRAINT "e2ee_group_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_envelopes" ADD CONSTRAINT "e2ee_group_envelopes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "e2ee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_envelopes" ADD CONSTRAINT "e2ee_group_envelopes_senderDeviceId_fkey" FOREIGN KEY ("senderDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
