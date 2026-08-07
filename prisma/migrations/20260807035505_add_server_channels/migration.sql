/*
  Warnings:

  - You are about to drop the column `topic` on the `ServerChannel` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serverId,name]` on the table `ServerCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serverId,name]` on the table `ServerChannel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serverId,position]` on the table `ServerChannel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `ServerChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serverId` to the `ServerChannel` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `ServerChannel` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TEXT', 'VOICE', 'ANNOUNCEMENT', 'FORUM', 'STAGE');

-- DropForeignKey
ALTER TABLE "public"."ServerChannel" DROP CONSTRAINT "ServerChannel_categoryId_fkey";

-- DropIndex
DROP INDEX "public"."ServerChannel_categoryId_position_key";

-- AlterTable
ALTER TABLE "ServerChannel" DROP COLUMN "topic",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "serverId" TEXT NOT NULL,
ALTER COLUMN "categoryId" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "ChannelType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ServerCategory_serverId_name_key" ON "ServerCategory"("serverId", "name");

-- CreateIndex
CREATE INDEX "ServerChannel_serverId_idx" ON "ServerChannel"("serverId");

-- CreateIndex
CREATE INDEX "ServerChannel_createdById_idx" ON "ServerChannel"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ServerChannel_serverId_name_key" ON "ServerChannel"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServerChannel_serverId_position_key" ON "ServerChannel"("serverId", "position");

-- AddForeignKey
ALTER TABLE "ServerChannel" ADD CONSTRAINT "ServerChannel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerChannel" ADD CONSTRAINT "ServerChannel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerChannel" ADD CONSTRAINT "ServerChannel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
