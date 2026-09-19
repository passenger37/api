import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

export class CommentNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(id ? `Comment ${id} not found` : 'Comment not found');
  }
}

export class PostNotFoundException extends NotFoundException {
  constructor(postId: string) {
    super(`Post ${postId} not found`);
  }
}

export class PostNotVisibleException extends ForbiddenException {
  constructor() {
    super('You do not have permission to view or comment on this post');
  }
}

export class PostLockedException extends ForbiddenException {
  constructor() {
    super('Comments are locked on this post');
  }
}

export class CrossPostReplyException extends BadRequestException {
  constructor() {
    super('Reply parent comment does not belong to the same post');
  }
}

export class CommentEditForbiddenException extends ForbiddenException {
  constructor() {
    super('You can only edit your own comments');
  }
}

export class CommentDeleteForbiddenException extends ForbiddenException {
  constructor() {
    super('You can only delete your own comments');
  }
}

export class CommentModerationForbiddenException extends ForbiddenException {
  constructor() {
    super('You do not have permission to moderate comments on this post');
  }
}

export class CommentContentTooLongException extends BadRequestException {
  constructor(maxLength: number) {
    super(`Comment content exceeds maximum length of ${maxLength} characters`);
  }
}

export class CommentContentEmptyException extends BadRequestException {
  constructor() {
    super('Comment content cannot be empty');
  }
}

export class DuplicateReactionException extends ConflictException {
  constructor() {
    super('You have already reacted to this comment');
  }
}

export class CommunityMembershipRequiredException extends ForbiddenException {
  constructor() {
    super('You must be a community member to comment on community posts');
  }
}

export class ServerMembershipRequiredException extends ForbiddenException {
  constructor() {
    super('You must be a server member to comment on channel posts');
  }
}
