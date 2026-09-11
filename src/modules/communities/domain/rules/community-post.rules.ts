import { CommunityPostContentType, CommunityPostVisibility, CommunityPostStatus, VoteType, PostReportReason } from '@prisma/client';
import { PostContentTypeVO } from '../value-objects/post-content-type.vo';
import { PostVisibilityVO } from '../value-objects/post-visibility.vo';
import { PostStatusVO } from '../value-objects/post-status.vo';

export const COMMUNITY_POST_RULES = {
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 10000,
  },
  TITLE_MAX_LENGTH: 200,
  CONTENT_MAX_LENGTH: 10000,
  MEDIA_MAX_COUNT: 10,
  HASHTAG_MAX_COUNT: 10,
  MENTION_MAX_COUNT: 20,
  CONTENT_WARNING_MAX_LENGTH: 200,
  EDIT_HISTORY_MAX_ENTRIES: 10,
  EDIT_HISTORY_RETENTION_DAYS: 365,
  VOTE_COOLDOWN_MS: 1000,
  REPORT_COOLDOWN_MS: 5000,
  EDIT_COOLDOWN_MS: 5000,
} as const;

export class CommunityPostRules {
  static validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Title is required' };
    }
    if (title.length < COMMUNITY_POST_RULES.TITLE.MIN_LENGTH) {
      return { valid: false, error: `Title must be at least ${COMMUNITY_POST_RULES.TITLE.MIN_LENGTH} characters` };
    }
    if (title.length > COMMUNITY_POST_RULES.TITLE.MAX_LENGTH) {
      return { valid: false, error: `Title cannot exceed ${COMMUNITY_POST_RULES.TITLE.MAX_LENGTH} characters` };
    }
    return { valid: true };
  }

  static validateContent(content: string): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Content is required' };
    }
    if (content.length < COMMUNITY_POST_RULES.CONTENT.MIN_LENGTH) {
      return { valid: false, error: `Content must be at least ${COMMUNITY_POST_RULES.CONTENT.MIN_LENGTH} characters` };
    }
    if (content.length > COMMUNITY_POST_RULES.CONTENT.MAX_LENGTH) {
      return { valid: false, error: `Content cannot exceed ${COMMUNITY_POST_RULES.CONTENT.MAX_LENGTH} characters` };
    }
    return { valid: true };
  }

  static validateMediaCount(count: number): { valid: boolean; error?: string } {
    if (count > COMMUNITY_POST_RULES.MEDIA_MAX_COUNT) {
      return { valid: false, error: `Cannot attach more than ${COMMUNITY_POST_RULES.MEDIA_MAX_COUNT} media items` };
    }
    return { valid: true };
  }

  static validateHashtagCount(count: number): { valid: boolean; error?: string } {
    if (count > COMMUNITY_POST_RULES.HASHTAG_MAX_COUNT) {
      return { valid: false, error: `Cannot use more than ${COMMUNITY_POST_RULES.HASHTAG_MAX_COUNT} hashtags` };
    }
    return { valid: true };
  }

  static validateMentionCount(count: number): { valid: boolean; error?: string } {
    if (count > COMMUNITY_POST_RULES.MENTION_MAX_COUNT) {
      return { valid: false, error: `Cannot mention more than ${COMMUNITY_POST_RULES.MENTION_MAX_COUNT} users` };
    }
    return { valid: true };
  }

  static validateContentWarning(warning: string): { valid: boolean; error?: string } {
    if (warning && warning.length > COMMUNITY_POST_RULES.CONTENT_WARNING_MAX_LENGTH) {
      return { valid: false, error: `Content warning cannot exceed ${COMMUNITY_POST_RULES.CONTENT_WARNING_MAX_LENGTH} characters` };
    }
    return { valid: true };
  }

  static validatePostCreation(input: {
    title: string;
    content: string;
    contentType?: string;
    visibility?: string;
    mediaIds?: string[];
    contentWarning?: string;
    isSensitive?: boolean;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const titleValidation = this.validateTitle(input.title);
    if (!titleValidation.valid) errors.push(titleValidation.error!);

    const contentValidation = this.validateContent(input.content);
    if (!contentValidation.valid) errors.push(contentValidation.error!);

    if (input.contentType) {
      try {
        new (require('../value-objects/post-content-type.vo').PostContentTypeVO)(input.contentType as any);
      } catch {
        errors.push('Invalid content type');
      }
    }

    if (input.visibility) {
      try {
        new (require('../value-objects/post-visibility.vo').PostVisibilityVO)(input.visibility as any);
      } catch {
        errors.push('Invalid visibility');
      }
    }

    if (input.mediaIds && input.mediaIds.length > 0) {
      const mediaValidation = this.validateMediaCount(input.mediaIds.length);
      if (!mediaValidation.valid) errors.push(mediaValidation.error!);
    }

    if (input.contentWarning) {
      const warningValidation = this.validateContentWarning(input.contentWarning);
      if (!warningValidation.valid) errors.push(warningValidation.error!);
    }

    return { valid: errors.length === 0, errors };
  }

  static validatePostUpdate(input: {
    title?: string;
    content?: string;
    visibility?: string;
    contentWarning?: string | null;
    isSensitive?: boolean;
    language?: string | null;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.title !== undefined) {
      const titleValidation = this.validateTitle(input.title);
      if (!titleValidation.valid) errors.push(titleValidation.error!);
    }

    if (input.content !== undefined) {
      const contentValidation = this.validateContent(input.content);
      if (!contentValidation.valid) errors.push(contentValidation.error!);
    }

    if (input.visibility) {
      try {
        new PostVisibilityVO(input.visibility as any);
      } catch {
        errors.push('Invalid visibility');
      }
    }

    if (input.contentWarning !== undefined && input.contentWarning !== null) {
      const warningValidation = this.validateContentWarning(input.contentWarning);
      if (!warningValidation.valid) errors.push(warningValidation.error!);
    }

    if (input.language !== undefined && input.language !== null && input.language.length > 10) {
      errors.push('Language code cannot exceed 10 characters');
    }

    return { valid: errors.length === 0, errors };
  }

  static validateVote(vote: string): { valid: boolean; error?: string } {
    if (!Object.values(VoteType).includes(vote as VoteType)) {
      return { valid: false, error: 'Invalid vote type. Must be UPVOTE or DOWNVOTE' };
    }
    return { valid: true };
  }

  static validateReportReason(reason: string): { valid: boolean; error?: string } {
    if (!Object.values(PostReportReason).includes(reason as PostReportReason)) {
      return { valid: false, error: 'Invalid report reason' };
    }
    return { valid: true };
  }

  static validateMentionPosition(position: number, contentLength: number, mentionLength: number): { valid: boolean; error?: string } {
    if (position < 0) {
      return { valid: false, error: 'Mention position cannot be negative' };
    }
    if (position + mentionLength > contentLength) {
      return { valid: false, error: 'Mention exceeds content length' };
    }
    return { valid: true };
  }

  static validateHashtag(tag: string): { valid: boolean; error?: string } {
    if (!tag || tag.trim().length === 0) {
      return { valid: false, error: 'Hashtag cannot be empty' };
    }
    if (!tag.startsWith('#')) {
      return { valid: false, error: 'Hashtag must start with #' };
    }
    if (tag.length > 50) {
      return { valid: false, error: 'Hashtag cannot exceed 50 characters' };
    }
    if (!/^#[a-zA-Z0-9_]+$/.test(tag)) {
      return { valid: false, error: 'Hashtag can only contain letters, numbers, and underscores' };
    }
    return { valid: true };
  }

  static normalizeHashtag(tag: string): string {
    return tag.toLowerCase().replace(/^#+/, '#');
  }

  static extractHashtags(content: string): string[] {
    const matches = content.match(/#[a-zA-Z0-9_]+/g);
    return matches ? matches.map(this.normalizeHashtag) : [];
  }

  static extractMentions(content: string): Array<{ username: string; position: number; length: number }> {
    const mentions: Array<{ username: string; position: number; length: number }> = [];
    const regex = /@([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      mentions.push({
        username: match[1],
        position: match.index,
        length: match[0].length,
      });
    }
    return mentions;
  }

  static canEditPost(post: { status: string; isDeleted: boolean; authorUserId: string }, userId: string, isModerator: boolean): { allowed: boolean; reason?: string } {
    const status = new PostStatusVO(post.status as any);

    if (post.isDeleted) {
      return { allowed: false, reason: 'Cannot edit a deleted post' };
    }

    if (!status.isEditable()) {
      return { allowed: false, reason: `Cannot edit a post with status: ${post.status}` };
    }

    if (post.authorUserId === userId) {
      return { allowed: true };
    }

    if (isModerator) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only the author or a moderator can edit this post' };
  }

  static canDeletePost(post: { isDeleted: boolean; authorUserId: string }, userId: string, isModerator: boolean): { allowed: boolean; reason?: string } {
    if (post.isDeleted) {
      return { allowed: false, reason: 'Post is already deleted' };
    }

    if (post.authorUserId === userId) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only the author or a moderator can delete this post' };
  }

  static canRestorePost(post: { isDeleted: boolean }, isModerator: boolean): { allowed: boolean; reason?: string } {
    if (!post.isDeleted) {
      return { allowed: false, reason: 'Post is not deleted' };
    }

    if (isModerator) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only a moderator can restore a deleted post' };
  }

  static canVote(post: { isDeleted: boolean; status: string }, userId: string, isBanned: boolean): { allowed: boolean; reason?: string } {
    if (post.isDeleted) {
      return { allowed: false, reason: 'Cannot vote on a deleted post' };
    }

    const status = new PostStatusVO(post.status as any);
    if (!status.isActive() && post.status !== 'HIDDEN' && post.status !== 'LOCKED') {
      return { allowed: false, reason: 'Cannot vote on this post' };
    }

    if (isBanned) {
      return { allowed: false, reason: 'You are banned from voting' };
    }

    return { allowed: true };
  }

  static canReport(post: { authorUserId: string; isDeleted: boolean; status: string }, userId: string): { allowed: boolean; reason?: string } {
    if (post.isDeleted) {
      return { allowed: false, reason: 'Cannot report a deleted post' };
    }

    if (post.authorUserId === userId) {
      return { allowed: false, reason: 'Cannot report your own post' };
    }

    const status = new PostStatusVO(post.status as any);
    if (status.isDeleted()) {
      return { allowed: false, reason: 'Cannot report a deleted post' };
    }

    return { allowed: true };
  }

  static canBookmark(post: { isDeleted: boolean; status: string }, userId: string): { allowed: boolean; reason?: string } {
    if (post.isDeleted) {
      return { allowed: false, reason: 'Cannot bookmark a deleted post' };
    }

    const status = new PostStatusVO(post.status as any);
    if (status.isDeleted() || status.isHidden()) {
      return { allowed: false, reason: 'Cannot bookmark a hidden or deleted post' };
    }

    return { allowed: true };
  }

  static isValidTransition(currentStatus: CommunityPostStatus, newStatus: CommunityPostStatus): boolean {
    const current = new PostStatusVO(currentStatus);
    const next = new PostStatusVO(newStatus);

    if (current.equals(next)) return false;

    // Valid transitions
    const validTransitions: Record<CommunityPostStatus, CommunityPostStatus[]> = {
      ACTIVE: [CommunityPostStatus.HIDDEN, CommunityPostStatus.LOCKED, CommunityPostStatus.MODERATION_PENDING, CommunityPostStatus.DELETED],
      HIDDEN: [CommunityPostStatus.ACTIVE, CommunityPostStatus.DELETED],
      LOCKED: [CommunityPostStatus.ACTIVE, CommunityPostStatus.DELETED],
      MODERATION_PENDING: [CommunityPostStatus.ACTIVE, CommunityPostStatus.HIDDEN, CommunityPostStatus.DELETED],
      DELETED: [CommunityPostStatus.ACTIVE], // Restore only
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  static getContentTypeFromMedia(hasMedia: boolean, hasContent: boolean): CommunityPostContentType {
    if (hasMedia && hasContent) return CommunityPostContentType.MIXED;
    if (hasMedia) return CommunityPostContentType.MEDIA;
    return CommunityPostContentType.TEXT;
  }

  static calculatePostScore(upvotes: number, downvotes: number): number {
    return upvotes - downvotes;
  }

  static calculateHotScore(upvotes: number, downvotes: number, createdAt: Date): number {
    const score = this.calculatePostScore(upvotes, downvotes);
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    // Reddit-style hot ranking: log10(max(|score|, 1)) + sign(score) * ageHours / 45000
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
    const logScore = Math.log10(Math.max(Math.abs(score), 1));
    return logScore + (sign * ageHours) / 45000;
  }

  static getPostTypeFromContent(contentType: CommunityPostContentType): 'TEXT' | 'MEDIA' | 'MIXED' | 'LINK' | 'POLL' {
    return contentType;
  }

  static getDefaultVisibility(isPrivateCommunity: boolean): CommunityPostVisibility {
    return isPrivateCommunity ? CommunityPostVisibility.COMMUNITY_MEMBERS : CommunityPostVisibility.COMMUNITY_MEMBERS;
  }

  static sanitizeContent(content: string): string {
    // Basic sanitization - remove potentially harmful content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength - 3) + '...';
  }

  static isValidMentionFormat(mention: string): boolean {
    return /^@[a-zA-Z0-9_]+$/.test(mention);
  }

  static isValidHashtagFormat(hashtag: string): boolean {
    return /^#[a-zA-Z0-9_]+$/.test(hashtag);
  }
}