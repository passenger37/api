import { CommunityVisibility } from '@prisma/client';

export interface CommunityResponse {
  id: string;
  serverId: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  visibility: CommunityVisibility;
  discoveryEnabled: boolean;
  ownerId: string;
  rules: Record<string, unknown> | null;
  postCount: number;
  subscriptionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityListResponse {
  items: CommunityResponse[];
  nextCursor: string | null;
}

export interface CategoryResponse {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
