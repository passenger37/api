-- CreateTable
CREATE TABLE "ServerInvite" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServerInvite_code_key" ON "ServerInvite"("code");

-- CreateIndex
CREATE INDEX "ServerInvite_serverId_idx" ON "ServerInvite"("serverId");

-- CreateIndex
CREATE INDEX "ServerInvite_code_idx" ON "ServerInvite"("code");

-- AddForeignKey
ALTER TABLE "ServerInvite" ADD CONSTRAINT "ServerInvite_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerInvite" ADD CONSTRAINT "ServerInvite_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
