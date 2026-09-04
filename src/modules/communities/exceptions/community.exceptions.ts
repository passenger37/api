import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class CommunityNotFoundException extends NotFoundException {
  constructor() {
    super('Community not found.');
  }
}

export class CommunitySlugConflictException extends BadRequestException {
  constructor() {
    super('A community with this slug already exists.');
  }
}

export class CommunityPostNotFoundException extends NotFoundException {
  constructor() {
    super('Post not found.');
  }
}

export class CommunityCommentNotFoundException extends NotFoundException {
  constructor() {
    super('Comment not found.');
  }
}

export class CommunityNotSubscribedException extends BadRequestException {
  constructor() {
    super('You are not subscribed to this community.');
  }
}

export class CommunityAlreadySubscribedException extends BadRequestException {
  constructor() {
    super('You are already subscribed to this community.');
  }
}

export class CommunityCategoryConflictException extends BadRequestException {
  constructor() {
    super('A category with this name already exists in the community.');
  }
}

export class CommunityAccessDeniedException extends ForbiddenException {
  constructor(message = 'You do not have access to this community.') {
    super(message);
  }
}
