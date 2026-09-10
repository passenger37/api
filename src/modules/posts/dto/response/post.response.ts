import { PostVisibility, PostStatus, PostContentType, ReactionType, PostReportReason, ReportStatus, PostType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationResponseDto } from '../../../../common/dto/pagination-response.dto';

export class PostAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  isVerified: boolean;
}

export class PostMediaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  order: number;
}

export class PostHashtagDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tag: string;
}

export class PostMentionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  mentionedUserId: string;

  @ApiProperty()
  position: number;

  @ApiProperty()
  length: number;

  @ApiProperty()
  mentionedUser: PostAuthorDto;
}

export class ReactionCountsDto {
  @ApiProperty()
  LIKE: number;

  @ApiProperty()
  LOVE: number;

  @ApiProperty()
  HAHA: number;

  @ApiProperty()
  WOW: number;

  @ApiProperty()
  SAD: number;

  @ApiProperty()
  ANGRY: number;

  @ApiProperty()
  FIRE: number;

  @ApiProperty()
  CELEBRATE: number;

  @ApiProperty()
  total: number;
}

export class ViewerStateDto {
  @ApiPropertyOptional({ enum: ReactionType })
  reaction?: ReactionType;

  @ApiProperty()
  isBookmarked: boolean;

  @ApiProperty()
  canEdit: boolean;

  @ApiProperty()
  canDelete: boolean;
}

export class PostDetailResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  authorId: string;

  @ApiProperty({ enum: PostType })
  type: PostType;

  @ApiPropertyOptional()
  content?: string;

  @ApiProperty({ enum: PostContentType })
  contentType: PostContentType;

  @ApiProperty({ enum: PostVisibility })
  visibility: PostVisibility;

  @ApiProperty({ enum: PostStatus })
  status: PostStatus;

  @ApiProperty()
  reactionCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  repostCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiPropertyOptional()
  originalPostId?: string;

  @ApiPropertyOptional()
  quotedPostId?: string;

  @ApiPropertyOptional()
  contentWarning?: string;

  @ApiProperty()
  isSensitive: boolean;

  @ApiPropertyOptional()
  language?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  editedAt?: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiProperty()
  author: PostAuthorDto;

  @ApiPropertyOptional()
  originalPost?: PostDetailResponse;

  @ApiPropertyOptional()
  quotedPost?: PostDetailResponse;

  @ApiProperty({ type: [PostMediaDto] })
  media: PostMediaDto[];

  @ApiProperty({ type: [PostHashtagDto] })
  hashtags: PostHashtagDto[];

  @ApiProperty({ type: [PostMentionDto] })
  mentions: PostMentionDto[];

  @ApiProperty()
  reactionCounts: ReactionCountsDto;

  @ApiProperty()
  viewer: ViewerStateDto;
}

export class PostListResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  authorId: string;

  @ApiProperty({ enum: PostType })
  type: PostType;

  @ApiPropertyOptional()
  content?: string;

  @ApiProperty({ enum: PostContentType })
  contentType: PostContentType;

  @ApiProperty({ enum: PostVisibility })
  visibility: PostVisibility;

  @ApiProperty({ enum: PostStatus })
  status: PostStatus;

  @ApiProperty()
  reactionCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  repostCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiPropertyOptional()
  originalPostId?: string;

  @ApiPropertyOptional()
  quotedPostId?: string;

  @ApiProperty()
  isSensitive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  editedAt?: Date;

  @ApiProperty()
  author: PostAuthorDto;

  @ApiPropertyOptional()
  originalPost?: PostListResponse;

  @ApiPropertyOptional()
  quotedPost?: PostListResponse;

  @ApiProperty({ type: [PostMediaDto] })
  media: PostMediaDto[];

  @ApiProperty({ type: [PostHashtagDto] })
  hashtags: PostHashtagDto[];

  @ApiProperty({ type: [PostMentionDto] })
  mentions: PostMentionDto[];

  @ApiProperty()
  viewer: ViewerStateDto;
}

export class PaginatedPostsResponse extends PaginationResponseDto<PostListResponse> {}

export class ReactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ReactionType })
  type: ReactionType;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  user: PostAuthorDto;
}

export class PaginatedReactionsResponse extends PaginationResponseDto<ReactionDto> {}

export class BookmarkDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  post: PostListResponse;
}

export class PaginatedBookmarksResponse extends PaginationResponseDto<BookmarkDto> {}

export class PostReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  reporterUserId: string;

  @ApiProperty({ enum: PostReportReason })
  reason: PostReportReason;

  @ApiPropertyOptional()
  detailText?: string | null;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiPropertyOptional()
  handledByUserId?: string | null;

  @ApiPropertyOptional()
  handledAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  reporter: PostAuthorDto;

  @ApiPropertyOptional()
  handledBy?: PostAuthorDto;
}

export class PaginatedReportsResponse extends PaginationResponseDto<PostReportDto> {}