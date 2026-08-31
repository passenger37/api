import { KeyDistributionCommandService } from './key-distribution-command.service';
import { NotFoundException } from '@nestjs/common';

describe('KeyDistributionCommandService', () => {
  let service: KeyDistributionCommandService;
  let repo: {
    findKeyBundlesForUser: jest.Mock;
    claimOneTimePrekeys: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findKeyBundlesForUser: jest.fn(),
      claimOneTimePrekeys: jest.fn(),
    };
    service = new KeyDistributionCommandService(repo as any);
  });

  it('should throw NotFoundException when total requested exceeds 100', async () => {
    const dto = { claims: [{ deviceId: 'dev1', count: 101 }] };

    await expect(service.claimKeyBundles('userA', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when a device does not exist', async () => {
    repo.findKeyBundlesForUser.mockResolvedValue([]);
    const dto = { claims: [{ deviceId: 'dev1', count: 1 }] };

    await expect(service.claimKeyBundles('userA', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should call repo.claimOneTimePrekeys when all devices exist', async () => {
    repo.findKeyBundlesForUser.mockResolvedValue([
      {
        deviceId: 'dev1',
        identityKeyPublic: 'ik',
        signedPrekey: null,
        oneTimePrekeyCount: 5,
      },
    ]);
    repo.claimOneTimePrekeys.mockResolvedValue({
      claimed: [
        { deviceId: 'dev1', preKeys: [{ preKeyId: 1, publicKey: 'k1' }] },
      ],
    });
    const dto = { claims: [{ deviceId: 'dev1', count: 1 }] };

    const result = await service.claimKeyBundles('userA', dto);

    expect(repo.findKeyBundlesForUser).toHaveBeenCalledWith('userA');
    expect(repo.claimOneTimePrekeys).toHaveBeenCalledWith('userA', dto.claims);
    expect(result).toEqual({
      claimed: [
        { deviceId: 'dev1', preKeys: [{ preKeyId: 1, publicKey: 'k1' }] },
      ],
    });
  });
});
