import { Test, TestingModule } from '@nestjs/testing';

import { UserSocialRepository } from './user-social.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

describe('UserSocialRepository', () => {
  let repo: UserSocialRepository;
  let prisma: {
    $transaction: jest.Mock;
    follow: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    block: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    mute: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    followRequest: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    userCircle: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const pagination = new PaginationQueryDto();
  pagination.page = 1;
  pagination.pageSize = 20;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
      follow: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      block: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      mute: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      followRequest: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      userCircle: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSocialRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(UserSocialRepository);
  });

  describe('follow relationship cleanup', () => {
    it('removes follow-request rows in both directions', async () => {
      prisma.followRequest.deleteMany.mockResolvedValue({ count: 2 });

      await repo.removeFollowRequestRelationship('a', 'b');

      expect(prisma.followRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { requesterId: 'a', receiverId: 'b' },
            { requesterId: 'b', receiverId: 'a' },
          ],
        },
      });
    });
  });

  describe('findSuggestedUsers', () => {
    it('excludes self, followed, blocked, blocked-by, and pending-request users', async () => {
      prisma.follow.findMany.mockResolvedValueOnce([
        { followingId: 'followed-1' },
      ]);
      prisma.block.findMany.mockResolvedValueOnce([{ blockedId: 'blocked-1' }]);
      prisma.block.findMany.mockResolvedValueOnce([{ blockerId: 'blocker-1' }]);
      prisma.followRequest.findMany.mockResolvedValueOnce([
        { receiverId: 'requested-1' },
      ]);
      prisma.user.findMany.mockResolvedValue([{ id: 'candidate-1' }]);
      prisma.user.count.mockResolvedValue(1);

      const result = await repo.findSuggestedUsers('user-1', pagination);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: {
              notIn: [
                'user-1',
                'followed-1',
                'blocked-1',
                'blocker-1',
                'requested-1',
              ],
            },
          },
        }),
      );
      expect(result.total).toBe(1);
    });
  });

  describe('UserCircle', () => {
    it('adds a circle member', async () => {
      prisma.userCircle.create.mockResolvedValue({ id: 'c-1' });

      await repo.addCircleMember('owner-1', 'member-1');

      expect(prisma.userCircle.create).toHaveBeenCalledWith({
        data: { ownerId: 'owner-1', memberId: 'member-1' },
      });
    });

    it('removes a circle member by compound key', async () => {
      prisma.userCircle.delete.mockResolvedValue({ id: 'c-1' });

      await repo.removeCircleMember('owner-1', 'member-1');

      expect(prisma.userCircle.delete).toHaveBeenCalledWith({
        where: {
          ownerId_memberId: { ownerId: 'owner-1', memberId: 'member-1' },
        },
      });
    });

    it('detects an existing circle member', async () => {
      prisma.userCircle.findUnique.mockResolvedValueOnce({ id: 'c-1' });

      await expect(
        repo.existsCircleMember('owner-1', 'member-1'),
      ).resolves.toBe(true);
      expect(prisma.userCircle.findUnique).toHaveBeenLastCalledWith({
        where: {
          ownerId_memberId: { ownerId: 'owner-1', memberId: 'member-1' },
        },
        select: { id: true },
      });
    });

    it('lists circle members with embedded member users', async () => {
      prisma.userCircle.findMany.mockResolvedValue([
        {
          createdAt: new Date(),
          member: {
            id: 'member-1',
            username: 'm1',
            displayName: 'M1',
            avatarUrl: null,
            isVerified: false,
          },
        },
      ]);
      prisma.userCircle.count.mockResolvedValue(1);

      const result = await repo.findCircleMembers('owner-1', 0, 20);

      expect(prisma.userCircle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: 'owner-1' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.members).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('block', () => {
    it('creates a block', async () => {
      await repo.blockUser('a', 'b');

      expect(prisma.block.create).toHaveBeenCalledWith({
        data: { blockerId: 'a', blockedId: 'b' },
      });
    });

    it('removes a block by compound key', async () => {
      await repo.unblockUser('a', 'b');

      expect(prisma.block.delete).toHaveBeenCalledWith({
        where: {
          blockerId_blockedId: { blockerId: 'a', blockedId: 'b' },
        },
      });
    });

    it('detects an existing block', async () => {
      prisma.block.findUnique.mockResolvedValueOnce({});
      await expect(repo.existsBlock('a', 'b')).resolves.toBe(true);
    });

    it('lists blocked users', async () => {
      prisma.block.findMany.mockResolvedValue([{ blocked: { id: 'b' } }]);
      prisma.block.count.mockResolvedValue(1);

      const result = await repo.findBlockedUsers('a', 0, 20);

      expect(result.blockedUsers).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('follow requests', () => {
    it('sends a follow request', async () => {
      await repo.sendFollowRequest('a', 'b');

      expect(prisma.followRequest.create).toHaveBeenCalledWith({
        data: { requesterId: 'a', receiverId: 'b' },
      });
    });

    it('cancels a follow request by compound key', async () => {
      await repo.cancelFollowRequest('a', 'b');

      expect(prisma.followRequest.delete).toHaveBeenCalledWith({
        where: {
          requesterId_receiverId: { requesterId: 'a', receiverId: 'b' },
        },
      });
    });

    it('accepts a request by creating a follow then removing the request', async () => {
      await repo.acceptFollowRequest('a', 'b');

      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'a', followingId: 'b' },
      });
      expect(prisma.followRequest.delete).toHaveBeenCalled();
    });

    it('detects an existing follow request', async () => {
      prisma.followRequest.findUnique.mockResolvedValueOnce({ id: 'r-1' });

      await expect(repo.existsFollowRequest('a', 'b')).resolves.toBe(true);
    });
  });

  describe('follow', () => {
    it('follows a user', async () => {
      await repo.followUser('a', 'b');

      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'a', followingId: 'b' },
      });
    });

    it('unfollows a user by compound key', async () => {
      await repo.unfollowUser('a', 'b');

      expect(prisma.follow.delete).toHaveBeenCalledWith({
        where: {
          followerId_followingId: { followerId: 'a', followingId: 'b' },
        },
      });
    });

    it('counts followers', async () => {
      prisma.follow.count.mockResolvedValue(5);

      await expect(repo.countFollowers('u')).resolves.toBe(5);
    });
  });
});
