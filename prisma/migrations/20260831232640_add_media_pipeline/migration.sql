-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaJobType" AS ENUM ('THUMBNAIL', 'TRANSCODE', 'AV_SCAN', 'WATERMARK', 'METADATA_EXTRACTION');

-- CreateTable
CREATE TABLE "media_jobs" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "type" "MediaJobType" NOT NULL,
    "status" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "retries" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_processing_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_processing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_thumbnails" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "variants" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_thumbnails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_transcodes" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "codec" TEXT NOT NULL,
    "bitrate" INTEGER,
    "sizeBytes" INTEGER,
    "duration" DOUBLE PRECISION,
    "status" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_transcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_av_scans" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "threatName" TEXT,
    "durationMs" INTEGER,
    "rawOutput" JSONB,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_av_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_jobs_attachmentId_idx" ON "media_jobs"("attachmentId");

-- CreateIndex
CREATE INDEX "media_jobs_status_idx" ON "media_jobs"("status");

-- CreateIndex
CREATE INDEX "media_jobs_type_status_idx" ON "media_jobs"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "media_processing_configs_key_key" ON "media_processing_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "media_thumbnails_attachmentId_key" ON "media_thumbnails"("attachmentId");

-- CreateIndex
CREATE INDEX "media_thumbnails_attachmentId_idx" ON "media_thumbnails"("attachmentId");

-- CreateIndex
CREATE INDEX "media_transcodes_attachmentId_idx" ON "media_transcodes"("attachmentId");

-- CreateIndex
CREATE INDEX "media_transcodes_status_idx" ON "media_transcodes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "media_transcodes_attachmentId_resolution_key" ON "media_transcodes"("attachmentId", "resolution");

-- CreateIndex
CREATE UNIQUE INDEX "media_av_scans_attachmentId_key" ON "media_av_scans"("attachmentId");

-- CreateIndex
CREATE INDEX "media_av_scans_attachmentId_idx" ON "media_av_scans"("attachmentId");

-- CreateIndex
CREATE INDEX "media_av_scans_result_idx" ON "media_av_scans"("result");

-- AddForeignKey
ALTER TABLE "media_jobs" ADD CONSTRAINT "media_jobs_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_thumbnails" ADD CONSTRAINT "media_thumbnails_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_transcodes" ADD CONSTRAINT "media_transcodes_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_av_scans" ADD CONSTRAINT "media_av_scans_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
