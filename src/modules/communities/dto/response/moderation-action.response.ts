import { CommunityModerationActionType } from '@prisma/client';

export interface ModerationActionResponse {
  id: string;
  communityId: string;
  moderatorUserId: string;
  actionType: CommunityModerationActionType;
  targetUserId: string | null;
  objectType: string | null;
  objectId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ModerationListResponse {
  items: ModerationActionResponse[];
  nextCursor: string | null;
}
