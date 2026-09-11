-- AlterEnum: extend CallStatus with the full documented state machine
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'CONNECTING';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'ENDING';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- AlterEnum: video channels are Server Channel types (VIDEO)
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'VIDEO';
ALTER TYPE "ServerChannelType" ADD VALUE IF NOT EXISTS 'VIDEO';