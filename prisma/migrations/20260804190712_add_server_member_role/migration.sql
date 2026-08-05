-- CreateTable
CREATE TABLE "ServerMemberRole" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerMemberRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerMemberRole_memberId_idx" ON "ServerMemberRole"("memberId");

-- CreateIndex
CREATE INDEX "ServerMemberRole_roleId_idx" ON "ServerMemberRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerMemberRole_memberId_roleId_key" ON "ServerMemberRole"("memberId", "roleId");

-- AddForeignKey
ALTER TABLE "ServerMemberRole" ADD CONSTRAINT "ServerMemberRole_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMemberRole" ADD CONSTRAINT "ServerMemberRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ServerRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
