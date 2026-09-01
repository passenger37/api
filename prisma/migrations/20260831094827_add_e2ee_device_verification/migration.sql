-- CreateTable
CREATE TABLE "e2ee_device_verifications" (
    "id" TEXT NOT NULL,
    "localDeviceId" TEXT NOT NULL,
    "remoteDeviceId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e2ee_device_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "e2ee_device_verifications_localDeviceId_idx" ON "e2ee_device_verifications"("localDeviceId");

-- CreateIndex
CREATE INDEX "e2ee_device_verifications_remoteDeviceId_idx" ON "e2ee_device_verifications"("remoteDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_device_verifications_localDeviceId_remoteDeviceId_key" ON "e2ee_device_verifications"("localDeviceId", "remoteDeviceId");

-- AddForeignKey
ALTER TABLE "e2ee_device_verifications" ADD CONSTRAINT "e2ee_device_verifications_localDeviceId_fkey" FOREIGN KEY ("localDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_device_verifications" ADD CONSTRAINT "e2ee_device_verifications_remoteDeviceId_fkey" FOREIGN KEY ("remoteDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
