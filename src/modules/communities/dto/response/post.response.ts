export interface PostResponse {
  id: string;
  communityId: string;
  categoryId: string | null;
  authorUserId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isDeleted: boolean;
  version: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
}

export interface PostListResponse {
  items: PostResponse[];
  nextCursor: string | null;
}

export interface CommentResponse {
  id: string;
  postId: string;
  parentId: string | null;
  authorUserId: string;
  content: string;
  isDeleted: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  replies: CommentResponse[];
}

export interface CommentListResponse {
  items: CommentResponse[];
  nextCursor: string | null;
}
