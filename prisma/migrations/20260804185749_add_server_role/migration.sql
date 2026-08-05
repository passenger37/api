-- CreateEnum
CREATE TYPE "ServerTemplateType" AS ENUM ('CODING', 'CLASSROOM', 'STUDY_GROUP', 'SCHOOL_CLUB', 'UNIVERSITY', 'COMPANY', 'GAMING', 'CUSTOM');

-- CreateTable
CREATE TABLE "ServerRole" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerRole_serverId_idx" ON "ServerRole"("serverId");

-- AddForeignKey
ALTER TABLE "ServerRole" ADD CONSTRAINT "ServerRole_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
