-- CreateTable
CREATE TABLE "e2ee_sealed_sender_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_sealed_sender_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_pir_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "encryptedQuery" TEXT NOT NULL,
    "encryptedResponse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_pir_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_metadata_policies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minPaddingSize" INTEGER NOT NULL DEFAULT 256,
    "maxPaddingSize" INTEGER NOT NULL DEFAULT 1024,
    "enableSealedSender" BOOLEAN NOT NULL DEFAULT true,
    "enablePir" BOOLEAN NOT NULL DEFAULT true,
    "batchWindowMs" INTEGER NOT NULL DEFAULT 100,
    "minBatchSize" INTEGER NOT NULL DEFAULT 5,
    "hideGroupMembership" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_metadata_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_indexes" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "serverId" TEXT,
    "channelId" TEXT,
    "authorId" TEXT,
    "searchableText" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "filters" JSONB,
    "resultCount" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "engine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "engine" TEXT NOT NULL,
    "totalSearches" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topQueries" JSONB,
    "zeroResultRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "e2ee_sealed_sender_keys_userId_isActive_idx" ON "e2ee_sealed_sender_keys"("userId", "isActive");

-- CreateIndex
CREATE INDEX "e2ee_sealed_sender_keys_deviceId_idx" ON "e2ee_sealed_sender_keys"("deviceId");

-- CreateIndex
CREATE INDEX "e2ee_pir_requests_userId_status_idx" ON "e2ee_pir_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "e2ee_pir_requests_deviceId_idx" ON "e2ee_pir_requests"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_metadata_policies_userId_key" ON "e2ee_metadata_policies"("userId");

-- CreateIndex
CREATE INDEX "search_indexes_serverId_idx" ON "search_indexes"("serverId");

-- CreateIndex
CREATE INDEX "search_indexes_channelId_idx" ON "search_indexes"("channelId");

-- CreateIndex
CREATE INDEX "search_indexes_authorId_idx" ON "search_indexes"("authorId");

-- CreateIndex
CREATE INDEX "search_indexes_createdAt_idx" ON "search_indexes"("createdAt");

-- CreateIndex
CREATE INDEX "search_indexes_searchableText_idx" ON "search_indexes"("searchableText");

-- CreateIndex
CREATE UNIQUE INDEX "search_indexes_contentType_contentId_key" ON "search_indexes"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "search_queries_userId_createdAt_idx" ON "search_queries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "search_queries_queryText_idx" ON "search_queries"("queryText");

-- CreateIndex
CREATE INDEX "search_queries_engine_idx" ON "search_queries"("engine");

-- CreateIndex
CREATE INDEX "search_analytics_date_idx" ON "search_analytics"("date");

-- CreateIndex
CREATE INDEX "search_analytics_engine_idx" ON "search_analytics"("engine");

-- CreateIndex
CREATE UNIQUE INDEX "search_analytics_date_engine_key" ON "search_analytics"("date", "engine");

-- AddForeignKey
ALTER TABLE "e2ee_sealed_sender_keys" ADD CONSTRAINT "e2ee_sealed_sender_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_sealed_sender_keys" ADD CONSTRAINT "e2ee_sealed_sender_keys_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_pir_requests" ADD CONSTRAINT "e2ee_pir_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_pir_requests" ADD CONSTRAINT "e2ee_pir_requests_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_metadata_policies" ADD CONSTRAINT "e2ee_metadata_policies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
