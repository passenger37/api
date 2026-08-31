-- CreateTable
CREATE TABLE "e2ee_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "identityKeyPublic" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_signed_prekeys" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "signedPreKeyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e2ee_signed_prekeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_one_time_prekeys" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "preKeyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e2ee_one_time_prekeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "e2ee_devices_userId_idx" ON "e2ee_devices"("userId");

-- CreateIndex
CREATE INDEX "e2ee_devices_userId_isRevoked_idx" ON "e2ee_devices"("userId", "isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_signed_prekeys_deviceId_signedPreKeyId_key" ON "e2ee_signed_prekeys"("deviceId", "signedPreKeyId");

-- CreateIndex
CREATE INDEX "e2ee_signed_prekeys_deviceId_isActive_idx" ON "e2ee_signed_prekeys"("deviceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_one_time_prekeys_deviceId_preKeyId_key" ON "e2ee_one_time_prekeys"("deviceId", "preKeyId");

-- CreateIndex
CREATE INDEX "e2ee_one_time_prekeys_deviceId_isConsumed_idx" ON "e2ee_one_time_prekeys"("deviceId", "isConsumed");

-- AddForeignKey
ALTER TABLE "e2ee_devices" ADD CONSTRAINT "e2ee_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_signed_prekeys" ADD CONSTRAINT "e2ee_signed_prekeys_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_one_time_prekeys" ADD CONSTRAINT "e2ee_one_time_prekeys_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;