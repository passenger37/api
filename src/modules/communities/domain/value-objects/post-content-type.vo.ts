import { CommunityPostContentType, CommunityPostVisibility, CommunityPostStatus } from '@prisma/client';

export class PostContentTypeVO {
  private readonly value: CommunityPostContentType;

  constructor(value: CommunityPostContentType) {
    if (!Object.values(CommunityPostContentType).includes(value)) {
      throw new Error(`Invalid content type: ${value}`);
    }
    this.value = value;
  }

  getValue(): CommunityPostContentType {
    return this.value;
  }

  equals(other: PostContentTypeVO): boolean {
    return this.value === other.value;
  }

  isText(): boolean {
    return this.value === CommunityPostContentType.TEXT;
  }

  isMedia(): boolean {
    return this.value === CommunityPostContentType.MEDIA;
  }

  isMixed(): boolean {
    return this.value === CommunityPostContentType.MIXED;
  }

  isLink(): boolean {
    return this.value === CommunityPostContentType.LINK;
  }

  isPoll(): boolean {
    return this.value === CommunityPostContentType.POLL;
  }

  static fromString(value: string): PostContentTypeVO {
    const upper = value.toUpperCase() as CommunityPostContentType;
    if (!Object.values(CommunityPostContentType).includes(upper)) {
      throw new Error(`Invalid content type: ${value}`);
    }
    return new PostContentTypeVO(upper);
  }

  static getAll(): CommunityPostContentType[] {
    return Object.values(CommunityPostContentType);
  }
}

export class PostVisibilityVO {
  private readonly value: CommunityPostVisibility;

  constructor(value: CommunityPostVisibility) {
    if (!Object.values(CommunityPostVisibility).includes(value)) {
      throw new Error(`Invalid visibility: ${value}`);
    }
    this.value = value;
  }

  getValue(): CommunityPostVisibility {
    return this.value;
  }

  equals(other: PostVisibilityVO): boolean {
    return this.value === other.value;
  }

  isPublic(): boolean {
    return this.value === CommunityPostVisibility.PUBLIC;
  }

  isCommunityMembers(): boolean {
    return this.value === CommunityPostVisibility.COMMUNITY_MEMBERS;
  }

  static fromString(value: string): PostVisibilityVO {
    const upper = value.toUpperCase() as CommunityPostVisibility;
    if (!Object.values(CommunityPostVisibility).includes(upper)) {
      throw new Error(`Invalid visibility: ${value}`);
    }
    return new PostVisibilityVO(upper);
  }

  static getAll(): CommunityPostVisibility[] {
    return Object.values(CommunityPostVisibility);
  }
}

export class PostStatusVO {
  private readonly value: CommunityPostStatus;

  constructor(value: CommunityPostStatus) {
    if (!Object.values(CommunityPostStatus).includes(value)) {
      throw new Error(`Invalid post status: ${value}`);
    }
    this.value = value;
  }

  getValue(): CommunityPostStatus {
    return this.value;
  }

  equals(other: PostStatusVO): boolean {
    return this.value === other.value;
  }

  isActive(): boolean {
    return this.value === CommunityPostStatus.ACTIVE;
  }

  isDeleted(): boolean {
    return this.value === CommunityPostStatus.DELETED;
  }

  isHidden(): boolean {
    return this.value === CommunityPostStatus.HIDDEN;
  }

  isLocked(): boolean {
    return this.value === CommunityPostStatus.LOCKED;
  }

  isModerationPending(): boolean {
    return this.value === CommunityPostStatus.MODERATION_PENDING;
  }

  isEditable(): boolean {
    return this.value === CommunityPostStatus.ACTIVE;
  }

  isDeletable(): boolean {
    return (
      [CommunityPostStatus.ACTIVE, CommunityPostStatus.HIDDEN, CommunityPostStatus.LOCKED] as CommunityPostStatus[]
    ).includes(this.value);
  }

  isModeratable(): boolean {
    return !([CommunityPostStatus.DELETED] as CommunityPostStatus[]).includes(this.value);
  }

  static fromString(value: string): PostStatusVO {
    const upper = value.toUpperCase() as CommunityPostStatus;
    if (!Object.values(CommunityPostStatus).includes(upper)) {
      throw new Error(`Invalid post status: ${value}`);
    }
    return new PostStatusVO(upper);
  }

  static getAll(): CommunityPostStatus[] {
    return Object.values(CommunityPostStatus);
  }

  static getModerationStates(): CommunityPostStatus[] {
    return [CommunityPostStatus.HIDDEN, CommunityPostStatus.LOCKED, CommunityPostStatus.MODERATION_PENDING];
  }
}