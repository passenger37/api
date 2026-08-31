import { KeyDistributionController } from './key-distribution.controller';

describe('KeyDistributionController', () => {
  let controller: KeyDistributionController;
  let queryService: { getKeyBundles: jest.Mock };
  let commandService: { claimKeyBundles: jest.Mock };

  beforeEach(() => {
    queryService = { getKeyBundles: jest.fn() };
    commandService = { claimKeyBundles: jest.fn() };
    controller = new KeyDistributionController(
      queryService as any,
      commandService as any,
    );
  });

  it('should return serialized key bundles for a user', async () => {
    queryService.getKeyBundles.mockResolvedValue({
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

    const result = await controller.getKeyBundles('userA');

    expect(queryService.getKeyBundles).toHaveBeenCalledWith('userA');
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

  it('should claim key bundles and return claimed prekeys', async () => {
    commandService.claimKeyBundles.mockResolvedValue({
      claimed: [
        { deviceId: 'dev1', preKeys: [{ preKeyId: 1, publicKey: 'k1' }] },
      ],
    });
    const dto = { claims: [{ deviceId: 'dev1', count: 1 }] };

    const result = await controller.claimKeyBundles('caller', 'userA', dto);

    expect(commandService.claimKeyBundles).toHaveBeenCalledWith('userA', dto);
    expect(result).toEqual({
      claimed: [
        { deviceId: 'dev1', preKeys: [{ preKeyId: 1, publicKey: 'k1' }] },
      ],
    });
  });
});
