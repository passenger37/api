-- CreateEnum
CREATE TYPE "ServerPermission" AS ENUM ('MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'CREATE_INVITE', 'KICK_MEMBERS', 'BAN_MEMBERS', 'TIMEOUT_MEMBERS', 'MANAGE_MESSAGES', 'MANAGE_THREADS', 'MANAGE_WEBHOOKS', 'MANAGE_EMOJIS', 'VIEW_AUDIT_LOG', 'MENTION_EVERYONE', 'ADMINISTRATOR');

-- CreateTable
CREATE TABLE "ServerRolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permission" "ServerPermission" NOT NULL,

    CONSTRAINT "ServerRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerRolePermission_roleId_idx" ON "ServerRolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerRolePermission_roleId_permission_key" ON "ServerRolePermission"("roleId", "permission");

-- AddForeignKey
ALTER TABLE "ServerRolePermission" ADD CONSTRAINT "ServerRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ServerRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
