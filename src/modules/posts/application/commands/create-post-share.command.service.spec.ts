import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShareDestinationType } from '@prisma/client';

import { CreatePostShareCommandService } from './create-post-share.command.service';

describe('CreatePostShareCommandService', () => {
  let service: CreatePostShareCommandService;
  let prisma: any;
  let postRepository: any;
  let postShareRepository: any;
  let postSharePolicy: any;
  let outboxRepository: any;
  let channelMessageCommandService: any;
  let dmCommandService: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const post = {
    id: 'p1',
    authorId: 'u1',
    content: 'Hello world',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    isDeleted: false,
    contentWarning: null,
    isSensitive: false,
    User: { username: 'alice', displayName: 'Alice' },
  };

  const shareRecord = {
    id: 'share1',
    postId: 'p1',
    actorUserId: 'u1',
    destinationType: ShareDestinationType.DM,
    destinationId: 'conv1',
    clientRequestId: null,
    createdAt: now,
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn({})),
    };
    postRepository = { findById: jest.fn() };
    postShareRepository = {
      create: jest.fn(),
      findByIdempotencyKey: jest.fn(),
    };
    postSharePolicy = {
      canSharePost: jest.fn().mockResolvedValue(undefined),
      canShareToDm: jest.fn().mockResolvedValue(undefined),
      canShareToChannel: jest.fn().mockResolvedValue(undefined),
      canCopyLink: jest.fn().mockResolvedValue(undefined),
      canShareExternally: jest.fn().mockResolvedValue(undefined),
    };
    outboxRepository = { create: jest.fn().mockResolvedValue(undefined) };
    channelMessageCommandService = {
      createMessage: jest.fn().mockResolvedValue({ id: 'm1' }),
    };
    dmCommandService = {
      send: jest.fn().mockResolvedValue({ id: 'dm1' }),
    };

    service = new CreatePostShareCommandService(
      prisma,
      postRepository,
      postShareRepository,
      postSharePolicy,
      outboxRepository,
      channelMessageCommandService,
      dmCommandService,
    );
  });

  describe('createPostShare', () => {
    it('should throw when the post does not exist', async () => {
      postRepository.findById.mockResolvedValue(null);

      await expect(
        service.createPostShare({
          actorId: 'u1',
          postId: 'nope',
          destinationType: ShareDestinationType.COPY_LINK,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(postSharePolicy.canSharePost).not.toHaveBeenCalled();
      expect(postShareRepository.create).not.toHaveBeenCalled();
    });

    it('should return an existing share for the same clientRequestId without re-delivering', async () => {
      postShareRepository.findByIdempotencyKey.mockResolvedValue(shareRecord);

      const result = await service.createPostShare({
        actorId: 'u1',
        postId: 'p1',
        destinationType: ShareDestinationType.DM,
        destinationId: 'conv1',
        clientRequestId: 'req-1',
      });

      expect(result.shareId).toBe('share1');
      expect(postRepository.findById).not.toHaveBeenCalled();
      expect(postShareRepository.create).not.toHaveBeenCalled();
      expect(dmCommandService.send).not.toHaveBeenCalled();
    });

    it('should record the share and deliver to a DM after commit', async () => {
      postRepository.findById.mockResolvedValue(post);
      postShareRepository.create.mockResolvedValue(shareRecord);

      const result = await service.createPostShare({
        actorId: 'u1',
        postId: 'p1',
        destinationType: ShareDestinationType.DM,
        destinationId: 'conv1',
      });

      expect(postSharePolicy.canSharePost).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ id: 'p1', visibility: 'PUBLIC' }),
      );
      expect(postSharePolicy.canShareToDm).toHaveBeenCalledWith('u1', 'conv1');

      expect(postShareRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'p1',
          actorUserId: 'u1',
          destinationType: ShareDestinationType.DM,
          destinationId: 'conv1',
        }),
        expect.any(Object),
      );

      expect(outboxRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'post-shared',
          payload: expect.objectContaining({ shareId: 'share1' }),
        }),
        expect.any(Object),
      );

      // Delivery must run AFTER the transaction commits, so the message
      // command opens its own transaction/broadcast.
      expect(dmCommandService.send).toHaveBeenCalledWith(
        'conv1',
        'u1',
        expect.stringContaining('Alice'),
      );
      expect(dmCommandService.send).toHaveBeenCalledWith(
        'conv1',
        'u1',
        expect.stringContaining('nexus.app/posts/p1'),
      );
      expect(channelMessageCommandService.createMessage).not.toHaveBeenCalled();

      expect(result.shareId).toBe('share1');
      expect(result.postId).toBe('p1');
      expect(result.destinationType).toBe(ShareDestinationType.DM);
    });

    it('should deliver to a channel using the actor user id', async () => {
      postRepository.findById.mockResolvedValue(post);
      postShareRepository.create.mockResolvedValue({
        ...shareRecord,
        destinationType: ShareDestinationType.SERVER_CHANNEL,
        destinationId: 'ch1',
      });

      await service.createPostShare({
        actorId: 'u1',
        postId: 'p1',
        destinationType: ShareDestinationType.SERVER_CHANNEL,
        destinationId: 'ch1',
      });

      expect(postSharePolicy.canShareToChannel).toHaveBeenCalledWith(
        'u1',
        'ch1',
      );
      expect(channelMessageCommandService.createMessage).toHaveBeenCalledWith(
        'ch1',
        'u1',
        expect.stringContaining('Alice'),
      );
      expect(dmCommandService.send).not.toHaveBeenCalled();
    });

    it('should record a COPY_LINK share without message delivery', async () => {
      postRepository.findById.mockResolvedValue(post);
      postShareRepository.create.mockResolvedValue({
        ...shareRecord,
        destinationType: ShareDestinationType.COPY_LINK,
        destinationId: undefined,
      });

      const result = await service.createPostShare({
        actorId: 'u1',
        postId: 'p1',
        destinationType: ShareDestinationType.COPY_LINK,
      });

      expect(postSharePolicy.canCopyLink).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ id: 'p1' }),
      );
      expect(postShareRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationType: ShareDestinationType.COPY_LINK,
        }),
        expect.any(Object),
      );
      expect(dmCommandService.send).not.toHaveBeenCalled();
      expect(channelMessageCommandService.createMessage).not.toHaveBeenCalled();

      expect(result.destinationType).toBe(ShareDestinationType.COPY_LINK);
    });

    it('should require a destinationId for a DM share', async () => {
      postRepository.findById.mockResolvedValue(post);

      await expect(
        service.createPostShare({
          actorId: 'u1',
          postId: 'p1',
          destinationType: ShareDestinationType.DM,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(postSharePolicy.canShareToDm).not.toHaveBeenCalled();
      expect(postShareRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getShareLink', () => {
    it('should return a share link for a shareable post', async () => {
      postRepository.findById.mockResolvedValue(post);

      const link = await service.getShareLink('u1', 'p1');

      expect(postSharePolicy.canCopyLink).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ id: 'p1' }),
      );
      expect(link).toBe('https://nexus.app/posts/p1');
    });

    it('should throw when the post does not exist', async () => {
      postRepository.findById.mockResolvedValue(null);

      await expect(service.getShareLink('u1', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});