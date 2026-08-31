import { KeyDistributionQueryService } from './key-distribution-query.service';

describe('KeyDistributionQueryService', () => {
  let service: KeyDistributionQueryService;
  let repo: {
    findKeyBundlesForUser: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findKeyBundlesForUser: jest.fn(),
    };
    service = new KeyDistributionQueryService(repo as any);
  });

  it('should return key bundles from repository', async () => {
    repo.findKeyBundlesForUser.mockResolvedValue([
      {
        deviceId: 'dev1',
        identityKeyPublic: 'ik',
        signedPrekey: { signedPreKeyId: 1, publicKey: 'spk', signature: 'sig' },
        oneTimePrekeyCount: 2,
      },
    ]);

    const result = await service.getKeyBundles('userA');

    expect(repo.findKeyBundlesForUser).toHaveBeenCalledWith('userA');
    expect(result).toEqual({
      devices: [
        {
          deviceId: 'dev1',
          identityKeyPublic: 'ik',
          signedPrekey: {
            signedPreKeyId: 1,
            publicKey: 'spk',
            signature: 'sig',
          },
          oneTimePrekeyCount: 2,
        },
      ],
    });
  });

  it('should throw NotFoundException when user has no active devices', async () => {
    repo.findKeyBundlesForUser.mockResolvedValue([]);

    await expect(service.getKeyBundles('userA')).rejects.toThrow(
      'No active devices found for user',
    );
  });
});
