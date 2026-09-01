-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SCHEDULED', 'RETRYING');

-- CreateEnum
CREATE TYPE "BackgroundJobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "BackgroundJobPriority" NOT NULL DEFAULT 'NORMAL',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "currentRetry" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "result" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "cronExpression" TEXT,
    "tags" TEXT[],
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_job_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "jobName" TEXT NOT NULL,
    "payload" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_job_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_job_dead_letters" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "lastError" TEXT,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_job_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_job_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "queueName" TEXT NOT NULL,
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "cancelled" INTEGER NOT NULL DEFAULT 0,
    "avgProcessingTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakConcurrent" INTEGER NOT NULL DEFAULT 0,
    "avgQueueTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_job_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "background_jobs_idempotencyKey_key" ON "background_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "background_jobs_queueName_status_idx" ON "background_jobs"("queueName", "status");

-- CreateIndex
CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");

-- CreateIndex
CREATE INDEX "background_jobs_scheduledAt_idx" ON "background_jobs"("scheduledAt");

-- CreateIndex
CREATE INDEX "background_jobs_correlationId_idx" ON "background_jobs"("correlationId");

-- CreateIndex
CREATE INDEX "background_jobs_idempotencyKey_idx" ON "background_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "background_jobs_userId_idx" ON "background_jobs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "background_job_schedules_name_key" ON "background_job_schedules"("name");

-- CreateIndex
CREATE INDEX "background_job_schedules_isActive_idx" ON "background_job_schedules"("isActive");

-- CreateIndex
CREATE INDEX "background_job_schedules_nextRunAt_idx" ON "background_job_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "background_job_schedules_userId_idx" ON "background_job_schedules"("userId");

-- CreateIndex
CREATE INDEX "background_job_dead_letters_jobId_idx" ON "background_job_dead_letters"("jobId");

-- CreateIndex
CREATE INDEX "background_job_dead_letters_queueName_idx" ON "background_job_dead_letters"("queueName");

-- CreateIndex
CREATE INDEX "background_job_dead_letters_failedAt_idx" ON "background_job_dead_letters"("failedAt");

-- CreateIndex
CREATE INDEX "background_job_metrics_date_idx" ON "background_job_metrics"("date");

-- CreateIndex
CREATE INDEX "background_job_metrics_queueName_idx" ON "background_job_metrics"("queueName");

-- CreateIndex
CREATE UNIQUE INDEX "background_job_metrics_date_queueName_key" ON "background_job_metrics"("date", "queueName");

-- AddForeignKey
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_job_schedules" ADD CONSTRAINT "background_job_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
