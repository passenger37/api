-- CreateEnum
CREATE TYPE "ServerVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "bannerUrl" TEXT,
    "visibility" "ServerVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Server_slug_key" ON "Server"("slug");

-- CreateIndex
CREATE INDEX "Server_ownerId_idx" ON "Server"("ownerId");

-- CreateIndex
CREATE INDEX "Server_visibility_idx" ON "Server"("visibility");

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
