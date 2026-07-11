/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `user_sessions` will be added. If there are existing duplicate values, this will fail.
  - The required column `sessionId` was added to the `user_sessions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionId_key" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_sessionId_idx" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_isRevoked_idx" ON "user_sessions"("isRevoked");
