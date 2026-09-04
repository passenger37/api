import {
  CommunityAccessDeniedException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityQueryService } from './community-query.service';

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
    _count: { posts: 0, subscriptions: 0 },
  };

  const privateCommunity = {
    ...publicCommunity,
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

      expect(result).toEqual(publicCommunity);
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

      expect(result).toEqual(privateCommunity);
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
    it('should serialize subscriptions and return a next cursor', async () => {
      repository.listSubscribed.mockResolvedValue([
        { id: 'sub1', community: publicCommunity },
        { id: 'sub2', community: { ...publicCommunity, id: 'c2', slug: 'two' } },
      ]);

      const result = await service.listSubscribed('u1', undefined, 2);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('sub2');
    });
  });
});
