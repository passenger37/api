import { E2eeDeviceController } from './e2ee-device.controller';

describe('E2eeDeviceController', () => {
  let controller: E2eeDeviceController;
  let commandService: {
    register: jest.Mock;
    rotateSignedPreKey: jest.Mock;
    refillOneTimePreKeys: jest.Mock;
    revoke: jest.Mock;
  };
  let queryService: {
    listMyDevices: jest.Mock;
  };
  let safetyNumberService: {
    verifySafetyNumber: jest.Mock;
    getVerificationStatus: jest.Mock;
  };
  let keyRotationService: {
    notifyClientOfNeededRotation: jest.Mock;
  };

  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  const device = {
    id: 'dev1',
    userId: 'userA',
    name: 'Laptop',
    platform: 'web',
    identityKeyPublic: 'ik',
    isRevoked: false,
    revokedAt: null,
    lastSeenAt: null,
    createdAt,
    updatedAt: createdAt,
    signedPreKeys: [
      {
        signedPreKeyId: 1,
        publicKey: 'spk',
        signature: 'sig',
      },
    ],
    _count: { oneTimePreKeys: 2 },
  };

  beforeEach(() => {
    commandService = {
      register: jest.fn(),
      rotateSignedPreKey: jest.fn(),
      refillOneTimePreKeys: jest.fn(),
      revoke: jest.fn(),
    };
    queryService = {
      listMyDevices: jest.fn(),
    };
    safetyNumberService = {
      verifySafetyNumber: jest.fn(),
      getVerificationStatus: jest.fn(),
    };
    keyRotationService = {
      notifyClientOfNeededRotation: jest.fn(),
    };
    controller = new E2eeDeviceController(
      commandService as any,
      queryService as any,
      safetyNumberService as any,
      keyRotationService as any,
    );
  });

  it('should register a device and return the serialized device', async () => {
    commandService.register.mockResolvedValue(device);
    const request = {
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
      signedPreKey: { signedPreKeyId: 1, publicKey: 'spk', signature: 'sig' },
      oneTimePreKeys: [{ preKeyId: 1, publicKey: 'k1' }],
    };

    const result = await controller.register('userA', request);

    expect(commandService.register).toHaveBeenCalledWith('userA', request);
    expect(result).toMatchObject({
      id: 'dev1',
      name: 'Laptop',
      oneTimePreKeyCount: 2,
      signedPreKey: {
        signedPreKeyId: 1,
        publicKey: 'spk',
        signature: 'sig',
      },
    });
  });

  it('should list a users devices', async () => {
    queryService.listMyDevices.mockResolvedValue([device]);

    const result = await controller.list('userA');

    expect(queryService.listMyDevices).toHaveBeenCalledWith('userA');
    expect(result).toEqual([device]);
  });

  it('should rotate a signed prekey and return the serialized key', async () => {
    commandService.rotateSignedPreKey.mockResolvedValue({
      signedPreKeyId: 2,
      publicKey: 'spk2',
      signature: 'sig2',
    });
    const request = {
      signedPreKeyId: 2,
      publicKey: 'spk2',
      signature: 'sig2',
    };

    const result = await controller.rotateSignedPreKey(
      'userA',
      'dev1',
      request,
    );

    expect(commandService.rotateSignedPreKey).toHaveBeenCalledWith(
      'userA',
      'dev1',
      request,
    );
    expect(result).toEqual({
      signedPreKeyId: 2,
      publicKey: 'spk2',
      signature: 'sig2',
    });
  });

  it('should refill one-time prekeys', async () => {
    commandService.refillOneTimePreKeys.mockResolvedValue({
      added: 1,
      available: 3,
    });
    const request = { keys: [{ preKeyId: 1, publicKey: 'k1' }] };

    const result = await controller.refillOneTimePreKeys(
      'userA',
      'dev1',
      request,
    );

    expect(commandService.refillOneTimePreKeys).toHaveBeenCalledWith(
      'userA',
      'dev1',
      request,
    );
    expect(result).toEqual({ added: 1, available: 3 });
  });

  it('should revoke a device', async () => {
    commandService.revoke.mockResolvedValue(undefined);

    const result = await controller.revoke('userA', 'dev1');

    expect(commandService.revoke).toHaveBeenCalledWith('userA', 'dev1');
    expect(result).toEqual({ revoked: true });
  });
});
