import {
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
      find: jest.fn(),
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

    it('should upsert idempotently when already subscribed', async () => {
      const existing = {
        id: 'sub1',
        communityId: 'c1',
        userId: 'u1',
        isMuted: true,
        subscribedAt: now,
      };
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.subscribe.mockResolvedValue(existing);

      const result = await service.subscribe('nexus', 'u1');

      expect(subscriptionRepository.subscribe).toHaveBeenCalledWith('c1', 'u1');
      expect(result.communityId).toBe('c1');
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
      subscriptionRepository.find.mockResolvedValue(null);

      await expect(
        service.setMuted('nexus', 'u1', true),
      ).rejects.toBeInstanceOf(CommunityNotSubscribedException);

      expect(subscriptionRepository.setMuted).not.toHaveBeenCalled();
    });

    it('should update the muted flag', async () => {
      const subscription = {
        id: 'sub1',
        communityId: 'c1',
        userId: 'u1',
        isMuted: false,
        subscribedAt: now,
      };
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      subscriptionRepository.find.mockResolvedValue(subscription);
      subscriptionRepository.setMuted.mockResolvedValue({
        ...subscription,
        isMuted: true,
      });

      const result = await service.setMuted('nexus', 'u1', true);

      expect(subscriptionRepository.find).toHaveBeenCalledWith('c1', 'u1');
      expect(subscriptionRepository.setMuted).toHaveBeenCalledWith(
        'c1',
        'u1',
        true,
      );
      expect(result.isMuted).toBe(true);
    });
  });
});
