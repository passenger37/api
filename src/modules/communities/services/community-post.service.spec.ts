import {
  CommunityAccessDeniedException,
  CommunityCommentNotFoundException,
  CommunityPostNotFoundException,
  CommunityNotSubscribedException,
} from '../exceptions/community.exceptions';
import { CommunityPostService } from './community-post.service';

describe('CommunityPostService', () => {
  let service: CommunityPostService;
  let repository: any;
  let postRepository: any;
  let commentRepository: any;
  let categoryRepository: any;
  let subscriptionRepository: any;
  let mediaRepository: any;
  let hashtagRepository: any;
  let mentionRepository: any;
  let access: any;
  let eventPublisher: any;
  let dbCache: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const communityRecord = {
    id: 'c1',
    serverId: 'srv1',
    ownerId: 'u1',
    name: 'Nexus',
    slug: 'nexus',
    visibility: 'PUBLIC',
    discoveryEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const post = {
    id: 'p1',
    communityId: 'c1',
    categoryId: null,
    authorUserId: 'u1',
    title: 'Hello',
    content: 'World',
    isPinned: false,
    isDeleted: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
    _count: { comments: 0 },
  };

  beforeEach(() => {
    repository = { findBySlugWithRelations: jest.fn() };
    postRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findPage: jest.fn(),
      findPageByCategory: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    commentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      listPostComments: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    categoryRepository = { findById: jest.fn() };
    subscriptionRepository = { isSubscribed: jest.fn() };
    mediaRepository = { createMany: jest.fn() };
    hashtagRepository = { createMany: jest.fn() };
    mentionRepository = { createMany: jest.fn() };
    access = { isModerator: jest.fn() };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    dbCache = { delMany: jest.fn().mockResolvedValue(undefined) };

    service = new CommunityPostService(
      repository,
      postRepository,
      commentRepository,
      categoryRepository,
      subscriptionRepository,
      mediaRepository,
      hashtagRepository,
      mentionRepository,
      access,
      eventPublisher,
      dbCache,
    );
  });

  describe('createPost', () => {
    it('should require a subscription before posting', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.isModerator.mockResolvedValue(false);
      subscriptionRepository.isSubscribed.mockResolvedValue(false);

      await expect(
        service.createPost('nexus', 'u2', { title: 'T', content: 'C' }),
      ).rejects.toBeInstanceOf(CommunityNotSubscribedException);
    });

    it('should create a post when subscribed', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.isModerator.mockResolvedValue(false);
      subscriptionRepository.isSubscribed.mockResolvedValue(true);
      postRepository.create.mockResolvedValue({ ...post, id: 'p1' });
      postRepository.findById.mockResolvedValue(post);

      const result = await service.createPost('nexus', 'u1', {
        title: 'Hello',
        content: 'World',
      });

      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          community: { connect: { id: 'c1' } },
          author: { connect: { id: 'u1' } },
          title: 'Hello',
          content: 'World',
        }),
      );
      expect(result.id).toBe('p1');
    });
  });

  describe('deleteComment', () => {
    it('should throw when the comment does not exist', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      commentRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteComment('nexus', 'nope', 'u1'),
      ).rejects.toBeInstanceOf(CommunityCommentNotFoundException);
    });

    it('should allow the author to delete their comment', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      commentRepository.findById.mockResolvedValue({
        id: 'c1',
        postId: 'p1',
        authorUserId: 'u1',
      });
      postRepository.findById.mockResolvedValue({ ...post, id: 'p1' });
      access.isModerator.mockResolvedValue(false);

      await service.deleteComment('nexus', 'c1', 'u1');

      expect(commentRepository.softDelete).toHaveBeenCalledWith('c1');
    });

    it('should deny deletion by a non-author non-moderator', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      commentRepository.findById.mockResolvedValue({
        id: 'c1',
        postId: 'p1',
        authorUserId: 'u1',
      });
      postRepository.findById.mockResolvedValue({ ...post, id: 'p1' });
      access.isModerator.mockResolvedValue(false);

      await expect(
        service.deleteComment('nexus', 'c1', 'u2'),
      ).rejects.toBeInstanceOf(CommunityAccessDeniedException);
    });
  });
});
