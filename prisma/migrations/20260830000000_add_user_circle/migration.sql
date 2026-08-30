-- CreateTable
CREATE TABLE "UserCircle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCircle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCircle_ownerId_idx" ON "UserCircle"("ownerId");

-- CreateIndex
CREATE INDEX "UserCircle_memberId_idx" ON "UserCircle"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCircle_ownerId_memberId_key" ON "UserCircle"("ownerId", "memberId");

-- AddForeignKey
ALTER TABLE "UserCircle" ADD CONSTRAINT "UserCircle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCircle" ADD CONSTRAINT "UserCircle_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;