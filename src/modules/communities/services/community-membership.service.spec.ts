import {
  CommunityAlreadySubscribedException,
  CommunityNotSubscribedException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityMembershipService } from './community-membership.service';

describe('CommunityMembershipService', () => {
  let service: CommunityMembershipService;
  let repository: any;
  let subscriptionRepository: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const communityRecord = {
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
  };

  beforeEach(() => {
    repository = { findBySlugWithRelations: jest.fn() };
    subscriptionRepository = {
      isSubscribed: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      setMuted: jest.fn(),
    };

    service = new CommunityMembershipService(
      repository,
      subscriptionRepository,
    );
  });

  describe('subscribe', () => {
    it('should throw when the community does not exist', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(null);

      await expect(service.subscribe('nope', 'u1')).rejects.toBeInstanceOf(
        CommunityNotFoundException,
      );
    });

    it('should throw when already subscribed', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.isSubscribed.mockResolvedValue(true);

      await expect(service.subscribe('nexus', 'u1')).rejects.toBeInstanceOf(
        CommunityAlreadySubscribedException,
      );
    });

    it('should subscribe and return a serialized subscription', async () => {
      const subscription = {
        id: 'sub1',
        communityId: 'c1',
        userId: 'u1',
        isMuted: false,
        subscribedAt: now,
      };
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.isSubscribed.mockResolvedValue(false);
      subscriptionRepository.subscribe.mockResolvedValue(subscription);

      const result = await service.subscribe('nexus', 'u1');

      expect(subscriptionRepository.subscribe).toHaveBeenCalledWith(
        'c1',
        'u1',
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'sub1',
          communityId: 'c1',
          community: { id: 'c1', name: 'Nexus', slug: 'nexus' },
        }),
      );
    });
  });

  describe('unsubscribe', () => {
    it('should throw when not subscribed', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.isSubscribed.mockResolvedValue(false);

      await expect(service.unsubscribe('nexus', 'u1')).rejects.toBeInstanceOf(
        CommunityNotSubscribedException,
      );
    });

    it('should unsubscribe when subscribed', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.isSubscribed.mockResolvedValue(true);

      await service.unsubscribe('nexus', 'u1');

      expect(subscriptionRepository.unsubscribe).toHaveBeenCalledWith(
        'c1',
        'u1',
      );
    });
  });

  describe('setMuted', () => {
    it('should throw when no subscription exists', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.setMuted.mockResolvedValue(null);

      await expect(
        service.setMuted('nexus', 'u1', true),
      ).rejects.toBeInstanceOf(CommunityNotSubscribedException);
    });

    it('should update the muted flag', async () => {
      const subscription = {
        id: 'sub1',
        communityId: 'c1',
        userId: 'u1',
        isMuted: true,
        subscribedAt: now,
      };
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.setMuted.mockResolvedValue(subscription);

      const result = await service.setMuted('nexus', 'u1', true);

      expect(subscriptionRepository.setMuted).toHaveBeenCalledWith(
        'c1',
        'u1',
        true,
      );
      expect(result.isMuted).toBe(true);
    });
  });
});
