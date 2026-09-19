import { CommunityDiscoveryService } from './community-discovery.service';

describe('CommunityDiscoveryService', () => {
  let service: CommunityDiscoveryService;
  let repository: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const community = {
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
    _count: { posts: 1, subscriptions: 2 },
  };

  beforeEach(() => {
    repository = {
      discoverPublic: jest.fn(),
      countDiscoverable: jest.fn(),
    };

    service = new CommunityDiscoveryService(repository);
  });

  describe('discover', () => {
    it('should return serialized communities with a next cursor', async () => {
      repository.discoverPublic.mockResolvedValue([
        community,
        { ...community, id: 'c2', slug: 'two' },
        { ...community, id: 'c3', slug: 'three' },
      ]);

      const result = await service.discover('nex', undefined, 2);

      expect(repository.discoverPublic).toHaveBeenCalledWith(
        'nex',
        2,
        undefined,
      );
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'c1',
          slug: 'nexus',
          postCount: 1,
          subscriptionCount: 2,
        }),
      );
      expect(result.nextCursor).toBe('c2');
    });

    it('should return null cursor when fewer than limit', async () => {
      repository.discoverPublic.mockResolvedValue([community]);

      const result = await service.discover(undefined, undefined, 20);

      expect(result.nextCursor).toBeNull();
    });
  });

  describe('countDiscoverable', () => {
    it('should return the count', async () => {
      repository.countDiscoverable.mockResolvedValue(5);

      await expect(service.countDiscoverable('nex')).resolves.toBe(5);
    });
  });
});
