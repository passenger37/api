/*
  Warnings:

  - You are about to drop the column `creatorId` on the `ServerInvite` table. All the data in the column will be lost.
  - You are about to drop the column `isTemporary` on the `ServerInvite` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `ServerInvite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ServerInvite` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ServerInvite" DROP CONSTRAINT "ServerInvite_creatorId_fkey";

-- DropIndex
DROP INDEX "public"."ServerInvite_code_idx";

-- AlterTable
ALTER TABLE "ServerInvite" DROP COLUMN "creatorId",
DROP COLUMN "isTemporary",
ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ServerInvite_channelId_idx" ON "ServerInvite"("channelId");

-- CreateIndex
CREATE INDEX "ServerInvite_createdById_idx" ON "ServerInvite"("createdById");

-- CreateIndex
CREATE INDEX "ServerInvite_expiresAt_idx" ON "ServerInvite"("expiresAt");

-- AddForeignKey
ALTER TABLE "ServerInvite" ADD CONSTRAINT "ServerInvite_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ServerChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerInvite" ADD CONSTRAINT "ServerInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
