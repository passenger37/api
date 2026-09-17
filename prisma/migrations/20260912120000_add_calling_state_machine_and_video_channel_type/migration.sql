-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VOICE', 'VIDEO');

-- CreateEnum
CREATE TYPE "CallScope" AS ENUM ('DM', 'GROUP', 'SERVER_CHANNEL', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CallParticipantState" AS ENUM ('JOINED', 'LEFT', 'MUTED', 'CAMERA_OFF');

-- AlterEnum: extend CallStatus with the full documented state machine
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'CONNECTING';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'ENDING';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- AlterEnum: video channels are Server Channel types (VIDEO)
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'VIDEO';
ALTER TYPE "ServerChannelType" ADD VALUE IF NOT EXISTS 'VIDEO';