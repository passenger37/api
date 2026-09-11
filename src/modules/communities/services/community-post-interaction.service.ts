import { Injectable } from '@nestjs/common';
import {
  CommunityPost,
  CommunityPostStatus,
  Prisma,
  ReportStatus,
  VoteType,
} from '@prisma/client';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityAccessDeniedException,
  CommunityDuplicateReportException,
  CommunityInvalidCursorException,
  CommunityModerationInvalidTargetException,
  CommunityNotFoundException,
  CommunityPostDeletedException,
  CommunityPostLockedException,
  CommunityPostNotFoundException,
  CommunityNotSubscribedException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityPostRepository } from '../repositories/community-post.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunityPostVoteRepository } from '../repositories/community-post-vote.repository';
import { CommunityPostBookmarkRepository } from '../repositories/community-post-bookmark.repository';
import { CommunityPostReportRepository } from '../repositories/community-post-report.repository';
import { CommunityPostEditHistoryRepository } from '../repositories/community-post-edit-history.repository';
import { CommunityPostMediaRepository } from '../repositories/community-post-media.repository';
import { CommunityPostHashtagRepository } from '../repositories/community-post-hashtag.repository';
import { CommunityPostMentionRepository } from '../repositories/community-post-mention.repository';
import {
  CommunityPostBookmarkResponse,
  CommunityPostDetailResponse,
  CommunityPostEditHistoryResponse,
  CommunityPostFeedQuery,
  CommunityPostListResponse,
  CommunityPostModerationInput,
  CommunityPostModerationResult,
  CommunityPostReportInput,
  CommunityPostReportResolveInput,
  CommunityPostReportResponse,
  CommunityPostViewerState,
  FeedSort,
  PaginatedBookmarksResponse,
  PaginatedCommunityPostsResponse,
  PaginatedReportsResponse,
  PaginatedVotesResponse,
  UpdateCommunityPostInput,
  VoteBreakdownResponse,
} from '../types/community-post.types';
import { CommunityPostWithRelations } from '../types/community.types';
import {
  decodeFeedCursor,
  encodeBookmarkCursor,
  encodeFeedCursor,
  encodeReportCursor,
  encodeVoteCursor,
} from '../constants/community-post.constants';
import { TwoFieldCursor, decodeTwoFieldCursor } from '../pagination/community-cursor';
import { CommunityPostMapper } from '../mappers/community-post.mapper';
import { CommunityEventPublisher } from '../events/community-event-publisher';
import { COMMUNITY_REALTIME_EVENTS } from '../realtime/community-realtime.constants';
import { CommunityPostModerationPolicy } from '../domain/policies/community-post-moderation.policy';
import { DbCacheService } from '../../../core/cache/db-cache.service';
import {
  COMMUNITY_FEED_CACHE,
  COMMUNITY_FEED_CACHE_LIMITS,
  COMMUNITY_FEED_CACHE_TTL_SEC,
  COMMUNITY_FEED_SORTS_ALL,
  COMMUNITY_FEED_SORTS_KEYED,
  communityFeedCacheKey,
} from '../constants/community-post.constants';

const FEED_DEFAULT_LIMIT = 20;
const FEED_MAX_LIMIT = 50;
const RESULT_DEFAULT_LIMIT = 20;
const RESULT_MAX_LIMIT = 100;

@Injectable()
export class CommunityPostInteractionService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly postRepository: CommunityPostRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly voteRepository: CommunityPostVoteRepository,
    private readonly bookmarkRepository: CommunityPostBookmarkRepository,
    private readonly reportRepository: CommunityPostReportRepository,
    private readonly editHistoryRepository: CommunityPostEditHistoryRepository,
    private readonly mediaRepository: CommunityPostMediaRepository,
    private readonly hashtagRepository: CommunityPostHashtagRepository,
    private readonly mentionRepository: CommunityPostMentionRepository,
    private readonly access: CommunityAccessService,
    private readonly moderationPolicy: CommunityPostModerationPolicy,
    private readonly eventPublisher: CommunityEventPublisher,
    private readonly dbCache: DbCacheService,
  ) {}

  async getPostDetail(
    slug: string,
    postId: string,
    viewerId: string,
  ): Promise<CommunityPostDetailResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    await this.requireMember(community.id, viewerId);

    const isModerator = await this.access.isModerator(community.id, viewerId);
    const canManage = post.authorUserId === viewerId || isModerator;

    if (
      !canManage &&
      (post.status === CommunityPostStatus.HIDDEN ||
        post.status === CommunityPostStatus.MODERATION_PENDING)
    ) {
      throw new CommunityPostNotFoundException();
    }

    const [vote, bookmark, detail] = await Promise.all([
      this.voteRepository.find(post.id, viewerId),
      this.bookmarkRepository.find(post.id, viewerId),
      this.postRepository.findDetail(post.id),
    ]);

    if (post.authorUserId !== viewerId) {
      await this.postRepository.incrementViewCount(post.id);
    }

    return CommunityPostMapper.toDetailResponse(
      detail!,
      this.viewerState(post, viewerId, isModerator, vote?.vote ?? null, Boolean(bookmark)),
    );
  }

  async slugToId(slug: string): Promise<string> {
    const community = await this.communityBySlug(slug);

    return community.id;
  }

  async listFeed(query: CommunityPostFeedQuery): Promise<PaginatedCommunityPostsResponse> {
    const community = await this.communityById(query.communityId);

    await this.requireMember(community.id, query.viewerId);

    const sort: FeedSort = query.sort ?? 'LATEST';
    const limit = this.clamp(query.limit ?? FEED_DEFAULT_LIMIT, 1, FEED_MAX_LIMIT);
    const decoded = query.cursor
      ? this.decodeFeedCursorSafe(query.cursor)
      : undefined;

    const key = communityFeedCacheKey(
      community.id,
      sort,
      query.categoryId ?? null,
      limit,
      query.cursor ?? 'first',
    );
    const ttl = COMMUNITY_FEED_CACHE_TTL_SEC[sort];

    return (await this.dbCache.remember<PaginatedCommunityPostsResponse>(
      COMMUNITY_FEED_CACHE,
      key,
      ttl,
      async () => {
        const rows = await this.postRepository.findFeedPage(
          community.id,
          sort,
          limit,
          decoded,
          query.categoryId ? { categoryId: query.categoryId } : undefined,
        );

        const hasMore = rows.length > limit;
        const posts = hasMore ? rows.slice(0, limit) : rows;
        const last = posts[posts.length - 1];

        const items = await this.withListViewerState(posts, community.id, query.viewerId);

        return {
          items,
          nextCursor:
            hasMore && last
              ? encodeFeedCursor({
                  isPinned: last.isPinned,
                  sortKey: String(
                    sort === 'CONTROVERSIAL' ? last.downvoteCount : last.upvoteCount,
                  ),
                  createdAt: last.createdAt.toISOString(),
                  id: last.id,
                })
              : null,
          hasMore,
        } as PaginatedCommunityPostsResponse;
      },
    ))!;
  }

  async votePost(
    slug: string,
    postId: string,
    userId: string,
    vote: VoteType,
  ): Promise<VoteBreakdownResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    await this.requireMember(community.id, userId);

    if (await this.access.isBannedFromVoting(community.id, userId)) {
      throw new CommunityAccessDeniedException(
        'Banned members cannot vote in this community.',
      );
    }

    await this.voteRepository.castVote(post.id, userId, vote);

    const counts = await this.breakdown(post.id);

    await this.invalidateFeed(community.id, true);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_VOTED, {
      postId: post.id,
      userId,
      vote,
      counts,
    });

    return counts;
  }

  async removeVote(
    slug: string,
    postId: string,
    userId: string,
  ): Promise<VoteBreakdownResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    await this.requireMember(community.id, userId);

    await this.voteRepository.removeVoteAndCounts(post.id, userId);

    const counts = await this.breakdown(post.id);

    await this.invalidateFeed(community.id, true);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_VOTED, {
      postId: post.id,
      userId,
      vote: null,
      counts,
    });

    return counts;
  }

  async listVotes(
    slug: string,
    postId: string,
    viewerId: string,
    cursor?: string,
    limit = RESULT_DEFAULT_LIMIT,
  ): Promise<PaginatedVotesResponse> {
    await this.beforeRead(slug, postId, viewerId);

    const bounded = this.clamp(limit, 1, RESULT_MAX_LIMIT);
    const decoded = cursor ? this.decodeTwoFieldCursorSafe(cursor) : undefined;

    const rows = await this.voteRepository.listByPost(postId, bounded, decoded);

    const hasMore = rows.length > bounded;
    const votes = hasMore ? rows.slice(0, bounded) : rows;
    const last = votes[votes.length - 1];

    return {
      items: votes.map((row) => CommunityPostMapper.toVoteResponse(row)),
      nextCursor:
        hasMore && last
          ? encodeVoteCursor(last.createdAt, last.id)
          : null,
      hasMore,
    };
  }

  async bookmarkPost(
    slug: string,
    postId: string,
    userId: string,
  ): Promise<CommunityPostBookmarkResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    await this.requireMember(community.id, userId);

    const row = await this.bookmarkRepository.addWithCount(post.id, userId);

    await this.invalidateFeed(community.id);

    const [vote, detail] = await Promise.all([
      this.voteRepository.find(post.id, userId),
      this.postRepository.findDetail(post.id),
    ]);

    const viewer: CommunityPostViewerState = {
      vote: vote?.vote ?? null,
      isBookmarked: true,
      canEdit: post.authorUserId === userId,
      canDelete: post.authorUserId === userId,
    };

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_BOOKMARKED, {
      postId: post.id,
      userId,
    });

    return {
      id: row.id,
      postId: row.postId,
      userId: row.userId,
      createdAt: row.createdAt,
      post: CommunityPostMapper.toListResponse(detail!, viewer),
    };
  }

  async removeBookmark(
    slug: string,
    postId: string,
    userId: string,
  ): Promise<{ bookmarked: false }> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    await this.requireMember(community.id, userId);

    await this.bookmarkRepository.removeWithCount(post.id, userId);

    await this.invalidateFeed(community.id);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_BOOKMARKED, {
      postId: post.id,
      userId,
      bookmarked: false,
    });

    return { bookmarked: false };
  }

  async listBookmarks(
    userId: string,
    cursor?: string,
    limit = RESULT_DEFAULT_LIMIT,
  ): Promise<PaginatedBookmarksResponse> {
    const bounded = this.clamp(limit, 1, RESULT_MAX_LIMIT);
    const decoded = cursor ? this.decodeTwoFieldCursorSafe(cursor) : undefined;

    const rows = await this.bookmarkRepository.listByUser(userId, bounded, decoded);

    const hasMore = rows.length > bounded;
    const bookmarks = hasMore ? rows.slice(0, bounded) : rows;
    const last = bookmarks[bookmarks.length - 1];

    const postIds = bookmarks.map((row) => row.postId);
    const details = (
      await Promise.all(postIds.map((id) => this.postRepository.findDetail(id)))
    ).filter((p): p is CommunityPostWithRelations => Boolean(p));

    const detailById = new Map(details.map((p) => [p.id, p]));
    const votes = await this.voteRepository.listForUserAndPosts(
      userId,
      Array.from(detailById.keys()),
    );
    const voteByPost = new Map(votes.map((v) => [v.postId, v.vote]));

    const items = bookmarks.flatMap((row) => {
      const post = detailById.get(row.postId);

      if (!post) {
        return [];
      }

      const viewer: CommunityPostViewerState = {
        vote: voteByPost.get(post.id) ?? null,
        isBookmarked: true,
        canEdit: post.authorUserId === userId,
        canDelete: post.authorUserId === userId,
      };

      return [
        {
          id: row.id,
          postId: row.postId,
          userId: row.userId,
          createdAt: row.createdAt,
          post: CommunityPostMapper.toListResponse(post, viewer),
        },
      ];
    });

    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeBookmarkCursor(last.createdAt, last.id)
          : null,
      hasMore,
    };
  }

  async reportPost(
    slug: string,
    postId: string,
    userId: string,
    input: CommunityPostReportInput,
  ): Promise<CommunityPostReportResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    if (post.authorUserId === userId) {
      throw new CommunityAccessDeniedException(
        'You cannot report your own post.',
      );
    }

    await this.requireMember(community.id, userId);

    const existing = await this.reportRepository.findByPostAndReporter(
      post.id,
      userId,
    );

    if (existing) {
      throw new CommunityDuplicateReportException();
    }

    const report = await this.reportRepository.create({
      postId: post.id,
      reporterUserId: userId,
      reason: input.reason,
      detailText: input.detailText,
    });

    const response = CommunityPostMapper.toReportResponse(report);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_REPORTED, {
      reportId: report.id,
      postId: post.id,
      reporterUserId: userId,
    });

    return response;
  }

  async listReports(
    slug: string,
    postId: string,
    viewerId: string,
    cursor?: string,
    limit = RESULT_DEFAULT_LIMIT,
  ): Promise<PaginatedReportsResponse> {
    await this.beforeRead(slug, postId, viewerId);

    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, viewerId);

    const bounded = this.clamp(limit, 1, RESULT_MAX_LIMIT);
    const decoded = cursor ? this.decodeTwoFieldCursorSafe(cursor) : undefined;

    const rows = await this.reportRepository.listByPost(postId, bounded, decoded);

    const hasMore = rows.length > bounded;
    const reports = hasMore ? rows.slice(0, bounded) : rows;
    const last = reports[reports.length - 1];

    return {
      items: reports.map((row) => CommunityPostMapper.toReportResponse(row)),
      nextCursor:
        hasMore && last
          ? encodeReportCursor(last.createdAt, last.id)
          : null,
      hasMore,
    };
  }

  async resolveReport(
    slug: string,
    reportId: string,
    moderatorId: string,
    input: CommunityPostReportResolveInput,
  ): Promise<CommunityPostReportResponse> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, moderatorId);

    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new CommunityModerationInvalidTargetException('Report not found.');
    }

    await this.postInCommunity(community.id, report.postId);

    const updated = await this.reportRepository.updateStatus(
      reportId,
      input.status as ReportStatus,
      moderatorId,
    );

    const response = CommunityPostMapper.toReportResponse(updated);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_REPORT_RESOLVED, {
      reportId,
      postId: report.postId,
      status: input.status,
      handledByUserId: moderatorId,
    });

    return response;
  }

  async editPost(
    slug: string,
    postId: string,
    userId: string,
    input: UpdateCommunityPostInput,
  ): Promise<CommunityPostDetailResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    const isModerator = await this.access.isModerator(community.id, userId);

    if (post.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    if (post.status === CommunityPostStatus.LOCKED && !isModerator) {
      throw new CommunityPostLockedException();
    }

    if (input.categoryId !== undefined && input.categoryId !== null) {
      const category = await this.categoryRepository.findById(input.categoryId);

      if (!category || category.communityId !== community.id) {
        throw new CommunityAccessDeniedException(
          'The category does not belong to this community.',
        );
      }
    }

    const data: Prisma.CommunityPostUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.contentWarning !== undefined) data.contentWarning = input.contentWarning;
    if (input.isSensitive !== undefined) data.isSensitive = input.isSensitive;
    if (input.language !== undefined) data.language = input.language;
    if (input.categoryId !== undefined) {
      data.category =
        input.categoryId === null
          ? { disconnect: true }
          : { connect: { id: input.categoryId } };
    }

    if (input.content !== undefined && input.content !== post.content) {
      await this.postRepository.updateContentWithHistory(
        post.id,
        data,
        post.content,
        userId,
      );
    } else {
      await this.postRepository.update(post.id, {
        ...data,
        editedAt: new Date(),
        version: { increment: 1 },
      });
    }

    if (input.hashtags !== undefined) {
      await this.hashtagRepository.replaceForPost(post.id, input.hashtags);
    }

    if (input.mentions !== undefined) {
      await this.mentionRepository.replaceForPost(
        post.id,
        input.mentions.map((m) => ({
          mentionedUserId: m.mentionedUserId,
          position: m.position,
          length: m.length,
        })),
      );
    }

    if (input.media !== undefined) {
      await this.mediaRepository.replaceForPost(
        post.id,
        input.media.map((item, index) => ({
          mediaId: item.mediaId,
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl ?? null,
          width: item.width ?? null,
          height: item.height ?? null,
          duration: item.duration ?? null,
          mimeType: item.mimeType,
          sortOrder: item.sortOrder ?? index,
          altText: item.altText ?? null,
          userId,
        })),
      );
    }

    const [vote, bookmark, detail] = await Promise.all([
      this.voteRepository.find(post.id, userId),
      this.bookmarkRepository.find(post.id, userId),
      this.postRepository.findDetail(post.id),
    ]);

    await this.invalidateFeed(community.id);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_EDITED, {
      postId: post.id,
      editedByUserId: userId,
    });

    return CommunityPostMapper.toDetailResponse(
      detail!,
      this.viewerState(post, userId, isModerator, vote?.vote ?? null, Boolean(bookmark)),
    );
  }

  async getEditHistory(
    slug: string,
    postId: string,
    viewerId: string,
    offset = 0,
    limit = 20,
  ): Promise<{ items: CommunityPostEditHistoryResponse[]; total: number }> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    const isModerator = await this.access.isModerator(community.id, viewerId);

    if (post.authorUserId !== viewerId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    const bounded = this.clamp(limit, 1, RESULT_MAX_LIMIT);
    const [items, total] = await Promise.all([
      this.editHistoryRepository.listByPost(post.id, offset, bounded),
      this.editHistoryRepository.countByPost(post.id),
    ]);

    return {
      items: items.map((row) => ({
        id: row.id,
        postId: row.postId,
        previousContent: row.previousContent,
        editedByUserId: row.editedByUserId,
        editedAt: row.editedAt,
      })),
      total,
    };
  }

  async moderatePost(
    slug: string,
    postId: string,
    moderatorId: string,
    input: CommunityPostModerationInput,
  ): Promise<CommunityPostModerationResult> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    await this.access.assertModerator(community.id, moderatorId);

    const context = {
      moderatorId,
      communityId: community.id,
      post,
      reason: input.reason,
    };

    let result: { post: CommunityPost };

    try {
      switch (input.action) {
        case 'LOCK':
          result = await this.moderationPolicy.lockPost(context);
          break;
        case 'UNLOCK':
          result = await this.moderationPolicy.unlockPost(context);
          break;
        case 'HIDE':
          result = await this.moderationPolicy.hidePost(context);
          break;
        case 'UNHIDE':
          result = await this.moderationPolicy.unhidePost(context);
          break;
        case 'PIN':
          result = await this.moderationPolicy.pinPost(context);
          break;
        case 'UNPIN':
          result = await this.moderationPolicy.unpinPost(context);
          break;
        default:
          throw new CommunityModerationInvalidTargetException(
            `Unsupported moderation action: ${input.action}`,
          );
      }
    } catch (error) {
      throw new CommunityModerationInvalidTargetException(
        error instanceof Error
          ? error.message
          : 'The moderation action could not be applied.',
      );
    }

    await this.invalidateFeed(community.id);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.POST_MODERATED, {
      postId: post.id,
      action: input.action,
      reason: input.reason,
      postStatus: result.post.status,
      isPinned: result.post.isPinned,
    });

    return {
      postId: post.id,
      action: input.action,
      reason: input.reason,
      postStatus: result.post.status,
      isPinned: result.post.isPinned,
    };
  }

  private async withListViewerState(
    posts: CommunityPostWithRelations[],
    communityId: string,
    viewerId: string,
  ): Promise<CommunityPostListResponse[]> {
    const postIds = posts.map((post) => post.id);

    const [votes, bookmarks, isModerator] = await Promise.all([
      this.voteRepository.listForUserAndPosts(viewerId, postIds),
      this.bookmarkRepository.listForUserAndPosts(viewerId, postIds),
      this.access.isModerator(communityId, viewerId),
    ]);

    const voteByPost = new Map(votes.map((v) => [v.postId, v.vote]));
    const bookmarkIds = new Set(bookmarks.map((b) => b.postId));

    return posts.map((post) =>
      CommunityPostMapper.toListResponse(post, {
        vote: voteByPost.get(post.id) ?? null,
        isBookmarked: bookmarkIds.has(post.id),
        canEdit: post.authorUserId === viewerId || isModerator,
        canDelete: post.authorUserId === viewerId || isModerator,
      }),
    );
  }

  private viewerState(
    post: CommunityPostWithRelations,
    viewerId: string,
    isModerator: boolean,
    vote: VoteType | null,
    isBookmarked: boolean,
  ): CommunityPostViewerState {
    const canManage = post.authorUserId === viewerId || isModerator;

    return {
      vote,
      isBookmarked,
      canEdit: canManage,
      canDelete: canManage,
    };
  }

  private async breakdown(postId: string): Promise<VoteBreakdownResponse> {
    const post = await this.postRepository.findById(postId);

    const upvotes = post?.upvoteCount ?? 0;
    const downvotes = post?.downvoteCount ?? 0;

    return {
      upvotes,
      downvotes,
      score: upvotes - downvotes,
    };
  }

  private async invalidateFeed(communityId: string, keyedOnly = false): Promise<void> {
    const sorts = keyedOnly
      ? COMMUNITY_FEED_SORTS_KEYED
      : COMMUNITY_FEED_SORTS_ALL;

    const keys: string[] = [];

    for (const sort of sorts) {
      for (const limit of COMMUNITY_FEED_CACHE_LIMITS) {
        keys.push(communityFeedCacheKey(communityId, sort, null, limit, 'first'));
      }
    }

    if (keys.length > 0) {
      await this.dbCache.delMany(COMMUNITY_FEED_CACHE, keys);
    }
  }

  private async beforeRead(
    slug: string,
    postId: string,
    viewerId: string,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    await this.requireMember(community.id, viewerId);
  }

  private async requireMember(
    communityId: string,
    userId: string,
  ): Promise<void> {
    const isModerator = await this.access.isModerator(communityId, userId);

    if (isModerator) {
      return;
    }

    const subscribed = await this.subscriptionRepository.isSubscribed(
      communityId,
      userId,
    );

    if (!subscribed) {
      throw new CommunityNotSubscribedException();
    }
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }

    return Math.min(Math.max(Math.floor(value), min), max);
  }

  private decodeFeedCursorSafe(
    cursor: string,
  ): { isPinned: boolean; sortKey: string; createdAt: string; id: string } {
    const decoded = decodeFeedCursor(cursor);

    if (!decoded) {
      throw new CommunityInvalidCursorException();
    }

    return decoded;
  }

  private decodeTwoFieldCursorSafe(cursor: string): TwoFieldCursor {
    try {
      return decodeTwoFieldCursor(cursor);
    } catch {
      throw new CommunityInvalidCursorException();
    }
  }

  private async communityBySlug(slug: string) {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }

  private async communityById(communityId: string) {
    const community = await this.repository.findById(communityId);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }

  private async postInCommunity(
    communityId: string,
    postId: string,
  ): Promise<CommunityPostWithRelations> {
    const post = await this.postRepository.findById(postId);

    if (!post || post.communityId !== communityId) {
      throw new CommunityPostNotFoundException();
    }

    return post;
  }
}