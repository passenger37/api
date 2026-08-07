-- CreateTable
CREATE TABLE "ServerChannelPermissionOverwrite" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "roleId" TEXT,
    "memberId" TEXT,
    "permission" "ServerPermission" NOT NULL,
    "allow" BOOLEAN NOT NULL DEFAULT false,
    "deny" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerChannelPermissionOverwrite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerChannelPermissionOverwrite_channelId_idx" ON "ServerChannelPermissionOverwrite"("channelId");

-- CreateIndex
CREATE INDEX "ServerChannelPermissionOverwrite_roleId_idx" ON "ServerChannelPermissionOverwrite"("roleId");

-- CreateIndex
CREATE INDEX "ServerChannelPermissionOverwrite_memberId_idx" ON "ServerChannelPermissionOverwrite"("memberId");

-- CreateIndex
CREATE INDEX "ServerChannelPermissionOverwrite_permission_idx" ON "ServerChannelPermissionOverwrite"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "ServerChannelPermissionOverwrite_channelId_roleId_memberId__key" ON "ServerChannelPermissionOverwrite"("channelId", "roleId", "memberId", "permission");

-- AddForeignKey
ALTER TABLE "ServerChannelPermissionOverwrite" ADD CONSTRAINT "ServerChannelPermissionOverwrite_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ServerChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerChannelPermissionOverwrite" ADD CONSTRAINT "ServerChannelPermissionOverwrite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ServerRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerChannelPermissionOverwrite" ADD CONSTRAINT "ServerChannelPermissionOverwrite_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
