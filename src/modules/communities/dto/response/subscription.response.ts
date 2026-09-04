export interface SubscriptionResponse {
  id: string;
  communityId: string;
  isMuted: boolean;
  subscribedAt: string;
  community?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SubscriptionListResponse {
  items: SubscriptionResponse[];
  nextCursor: string | null;
}
