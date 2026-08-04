-- CreateEnum
CREATE TYPE "ServerChannelType" AS ENUM ('TEXT', 'VOICE', 'ANNOUNCEMENT', 'FORUM', 'STAGE');

-- CreateTable
CREATE TABLE "ServerCategory" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerChannel" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServerChannelType" NOT NULL,
    "topic" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerCategory_serverId_idx" ON "ServerCategory"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerCategory_serverId_position_key" ON "ServerCategory"("serverId", "position");

-- CreateIndex
CREATE INDEX "ServerChannel_categoryId_idx" ON "ServerChannel"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerChannel_categoryId_position_key" ON "ServerChannel"("categoryId", "position");

-- AddForeignKey
ALTER TABLE "ServerCategory" ADD CONSTRAINT "ServerCategory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerChannel" ADD CONSTRAINT "ServerChannel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServerCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
