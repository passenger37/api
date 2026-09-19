import {
  Post,
  PostReaction,
  PostSave,
  PostReport,
  User,
  PostMedia,
  PostHashtag,
  PostMention,
} from '@prisma/client';
import { ReactionType } from '@prisma/client';
import {
  PostDetailResponse,
  PostListResponse,
  ViewerStateDto,
  ReactionCountsDto,
  PostAuthorDto,
  PostMediaDto,
  PostHashtagDto,
  PostMentionDto,
  ReactionDto,
  BookmarkDto,
} from '../dto/response/post.response';

export interface PostDetailViewData {
  viewerReaction?: ReactionType | null;
  isBookmarked: boolean;
  reactionCounts: ReactionCountsDto;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PostListViewData {
  viewerReaction?: ReactionType | null;
  isBookmarked: boolean;
  reactionCounts: ReactionCountsDto;
  canEdit: boolean;
  canDelete: boolean;
}

export type PostDetailResponseType = PostDetailResponse;
export type PostListResponseType = PostListResponse;
export type ReactionDtoType = ReactionDto;
export type BookmarkDtoType = BookmarkDto;
