import {
  CommunityAccessDeniedException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityQueryService } from './community-query.service';
import { encodeTwoFieldCursor } from '../pagination/community-cursor';

describe('CommunityQueryService', () => {
  let service: CommunityQueryService;
  let repository: any;
  let categoryRepository: any;
  let subscriptionRepository: any;
  let access: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const publicCommunity = {
    id: 'c1',
    serverId: 'srv1',
    ownerId: 'u1',
    name: 'Nexus',
    slug: 'nexus',
    description: null,
    iconUrl: null,
    visibility: 'PUBLIC',
    discoveryEnabled: true,
    rules: null,
    createdAt: now,
    updatedAt: now,
    _count: { posts: 2, subscriptions: 3 },
  };

  const serializedPublic = {
    id: 'c1',
    serverId: 'srv1',
    name: 'Nexus',
    slug: 'nexus',
    description: null,
    iconUrl: null,
    visibility: 'PUBLIC',
    discoveryEnabled: true,
    ownerId: 'u1',
    rules: null,
    postCount: 2,
    subscriptionCount: 3,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const privateCommunity = {
    ...publicCommunity,
    slug: 'secret',
    visibility: 'PRIVATE',
  };

  const serializedPrivate = {
    ...serializedPublic,
    slug: 'secret',
    visibility: 'PRIVATE',
  };

  beforeEach(() => {
    repository = {
      findBySlugWithRelations: jest.fn(),
      listSubscribed: jest.fn(),
    };
    categoryRepository = { list: jest.fn() };
    subscriptionRepository = {
      isSubscribed: jest.fn(),
      find: jest.fn(),
    };
    access = { isModerator: jest.fn() };

    service = new CommunityQueryService(
      repository,
      categoryRepository,
      subscriptionRepository,
      access,
    );
  });

  describe('getBySlug', () => {
    it('should throw when the community does not exist', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(null);

      await expect(service.getBySlug('nope', 'u1')).rejects.toBeInstanceOf(
        CommunityNotFoundException,
      );
    });

    it('should return a public community without a subscription', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(publicCommunity);

      const result = await service.getBySlug('nexus', 'u1');

      expect(result).toEqual(serializedPublic);
    });

    it('should deny access to a private community when the user is not subscribed', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(privateCommunity);
      access.isModerator.mockResolvedValue(false);
      subscriptionRepository.isSubscribed.mockResolvedValue(false);

      await expect(service.getBySlug('secret', 'u1')).rejects.toBeInstanceOf(
        CommunityAccessDeniedException,
      );
    });

    it('should allow a moderator into a private community', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(privateCommunity);
      access.isModerator.mockResolvedValue(true);

      const result = await service.getBySlug('secret', 'u1');

      expect(result).toEqual(serializedPrivate);
    });
  });

  describe('getSubscriptionState', () => {
    it('should report unsubscribed state', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(publicCommunity);
      subscriptionRepository.find.mockResolvedValue(null);

      const result = await service.getSubscriptionState('nexus', 'u1');

      expect(result).toEqual({ subscribed: false, isMuted: false });
    });

    it('should report muted state', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(publicCommunity);
      subscriptionRepository.find.mockResolvedValue({
        isMuted: true,
      });

      const result = await service.getSubscriptionState('nexus', 'u1');

      expect(result).toEqual({ subscribed: true, isMuted: true });
    });
  });

  describe('listSubscribed', () => {
    it('should serialize subscriptions and return an encoded next cursor', async () => {
      const sub1 = {
        id: 'sub1',
        subscribedAt: new Date('2026-01-01T00:00:00.000Z'),
        community: publicCommunity,
      };
      const sub2 = {
        id: 'sub2',
        subscribedAt: new Date('2026-01-02T00:00:00.000Z'),
        community: { ...publicCommunity, id: 'c2', slug: 'two' },
      };
      repository.listSubscribed.mockResolvedValue([sub1, sub2]);

      const result = await service.listSubscribed('u1', undefined, 1);

      expect(repository.listSubscribed).toHaveBeenCalledWith(
        'u1',
        1,
        undefined,
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('c1');
      expect(result.items[0].postCount).toBe(2);
      expect(result.nextCursor).toBe(
        encodeTwoFieldCursor({ createdAt: sub1.subscribedAt, id: 'sub1' }),
      );
    });
  });
});
