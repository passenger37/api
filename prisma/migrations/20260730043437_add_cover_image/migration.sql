/*
  Warnings:

  - You are about to drop the column `coverPhotoUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "coverPhotoUrl",
ADD COLUMN     "coverImageUrl" TEXT;
