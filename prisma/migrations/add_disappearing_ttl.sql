-- Add disappearingTtlSeconds column to DirectMessageChannel
ALTER TABLE "DirectMessageChannel" ADD COLUMN IF NOT EXISTS "disappearingTtlSeconds" INTEGER;