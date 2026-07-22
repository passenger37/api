/*
  Warnings:

  - You are about to drop the column `assignedBy` on the `UserRole` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserRole" DROP COLUMN "assignedBy",
ADD COLUMN     "assignedById" TEXT;

-- CreateTable
CREATE TABLE "AuthorizationAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "roleId" TEXT,
    "permissionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorizationAuditLog_actorId_idx" ON "AuthorizationAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuthorizationAuditLog_targetUserId_idx" ON "AuthorizationAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AuthorizationAuditLog_action_idx" ON "AuthorizationAuditLog"("action");

-- CreateIndex
CREATE INDEX "AuthorizationAuditLog_createdAt_idx" ON "AuthorizationAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
