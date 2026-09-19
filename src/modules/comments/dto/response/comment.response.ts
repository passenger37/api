import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentPostType, CommentStatus, VoteType } from '@prisma/client';

class CommentAuthorResponse {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiProperty() isVerified!: boolean;
}

class CommentViewerStateResponse {
  @ApiProperty({ enum: ['UPVOTE', 'DOWNVOTE', null], nullable: true })
  viewerVote!: VoteType | null;

  @ApiProperty() viewerCanEdit!: boolean;
  @ApiProperty() viewerCanDelete!: boolean;
  @ApiProperty() viewerCanModerate!: boolean;
}

export class CommentResponse {
  @ApiProperty() id!: string;
  @ApiProperty() postId!: string;
  @ApiProperty({ enum: CommentPostType }) postType!: CommentPostType;
  @ApiPropertyOptional() parentCommentId?: string | null;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: CommentStatus }) status!: CommentStatus;
  @ApiProperty() upvoteCount!: number;
  @ApiProperty() downvoteCount!: number;
  @ApiProperty() score!: number;
  @ApiProperty() replyCount!: number;
  @ApiProperty() version!: number;
  @ApiProperty({ type: CommentAuthorResponse }) author!: CommentAuthorResponse;
  @ApiProperty({ type: CommentViewerStateResponse })
  viewer!: CommentViewerStateResponse;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() editedAt?: Date | null;
  @ApiPropertyOptional() deletedAt?: Date | null;
}

export class CommentListResponse {
  @ApiProperty({ type: [CommentResponse] }) items!: CommentResponse[];
  @ApiPropertyOptional() nextCursor?: string | null;
}

export class CommentReactionResponse {
  @ApiProperty({ enum: VoteType }) vote!: VoteType;
  @ApiProperty() scoreDelta!: number;
}
