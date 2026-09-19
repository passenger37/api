import { BadRequestException, NotFoundException } from '@nestjs/common';

import { E2eeDeviceCommandService } from './e2ee-device-command.service';

describe('E2eeDeviceCommandService', () => {
  let service: E2eeDeviceCommandService;
  let prisma: {
    $transaction: jest.Mock;
  };
  let deviceRepository: {
    countForUser: jest.Mock;
    create: jest.Mock;
    findActiveById: jest.Mock;
    markRevoked: jest.Mock;
  };
  let signedPreKeyRepository: {
    createInitial: jest.Mock;
    rotate: jest.Mock;
  };
  let oneTimePreKeyRepository: {
    addBatch: jest.Mock;
    countUnconsumed: jest.Mock;
  };

  const device = {
    id: 'dev1',
    userId: 'userA',
    name: 'Laptop',
    platform: 'web',
    identityKeyPublic: 'ik',
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((callback) => callback({} as any)),
    };
    deviceRepository = {
      countForUser: jest.fn(),
      create: jest.fn(),
      findActiveById: jest.fn(),
      markRevoked: jest.fn(),
    };
    signedPreKeyRepository = {
      createInitial: jest.fn(),
      rotate: jest.fn(),
    };
    oneTimePreKeyRepository = {
      addBatch: jest.fn(),
      countUnconsumed: jest.fn(),
    };

    service = new E2eeDeviceCommandService(
      prisma as any,
      deviceRepository as any,
      signedPreKeyRepository as any,
      oneTimePreKeyRepository as any,
    );
  });

  describe('register', () => {
    const request = {
      name: 'Laptop',
      platform: 'web',
      identityKeyPublic: 'ik',
      signedPreKey: {
        signedPreKeyId: 1,
        publicKey: 'spk',
        signature: 'sig',
      },
      oneTimePreKeys: [
        { preKeyId: 1, publicKey: 'k1' },
        { preKeyId: 2, publicKey: 'k2' },
      ],
    };

    it('should register a device and its key material in one transaction', async () => {
      deviceRepository.countForUser.mockResolvedValue(0);
      deviceRepository.create.mockResolvedValue(device);
      signedPreKeyRepository.createInitial.mockResolvedValue({
        id: 'spk1',
        ...request.signedPreKey,
        isActive: true,
      });
      oneTimePreKeyRepository.addBatch.mockResolvedValue(2);

      const result = await service.register('userA', request);

      expect(deviceRepository.create).toHaveBeenCalledWith(
        {
          userId: 'userA',
          name: 'Laptop',
          platform: 'web',
          identityKeyPublic: 'ik',
        },
        {},
      );
      expect(signedPreKeyRepository.createInitial).toHaveBeenCalledWith(
        'dev1',
        request.signedPreKey,
        {},
      );
      expect(oneTimePreKeyRepository.addBatch).toHaveBeenCalledWith(
        'dev1',
        request.oneTimePreKeys,
        {},
      );
      expect(result).toEqual(device);
    });

    it('should reject registration when the device limit is reached', async () => {
      deviceRepository.countForUser.mockResolvedValue(10);

      await expect(service.register('userA', request as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(deviceRepository.create).not.toHaveBeenCalled();
    });

    it('should reject an oversized one-time prekey batch', async () => {
      const oversized = {
        ...request,
        oneTimePreKeys: Array.from({ length: 101 }, (_, i) => ({
          preKeyId: i,
          publicKey: `k${i}`,
        })),
      };

      await expect(service.register('userA', oversized as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('rotateSignedPreKey', () => {
    const request = {
      signedPreKeyId: 5,
      publicKey: 'new-spk',
      signature: 'new-sig',
    };

    it('should rotate the active signed prekey for an owned device', async () => {
      deviceRepository.findActiveById.mockResolvedValue(device);
      signedPreKeyRepository.rotate.mockResolvedValue({
        id: 'spk5',
        ...request,
        isActive: true,
      });

      const result = await service.rotateSignedPreKey('userA', 'dev1', request);

      expect(signedPreKeyRepository.rotate).toHaveBeenCalledWith(
        'dev1',
        request,
      );
      expect(result).toEqual({
        id: 'spk5',
        ...request,
        isActive: true,
      });
    });

    it('should not rotate a device owned by another user', async () => {
      deviceRepository.findActiveById.mockResolvedValue({
        ...device,
        userId: 'userB',
      });

      await expect(
        service.rotateSignedPreKey('userA', 'dev1', request as any),
      ).rejects.toThrow(NotFoundException);
      expect(signedPreKeyRepository.rotate).not.toHaveBeenCalled();
    });

    it('should not rotate a revoked or missing device', async () => {
      deviceRepository.findActiveById.mockResolvedValue(null);

      await expect(
        service.rotateSignedPreKey('userA', 'dev1', request as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('refillOneTimePreKeys', () => {
    const keys = [{ preKeyId: 10, publicKey: 'k10' }];

    it('should add a batch and report availability', async () => {
      deviceRepository.findActiveById.mockResolvedValue(device);
      oneTimePreKeyRepository.addBatch.mockResolvedValue(1);
      oneTimePreKeyRepository.countUnconsumed.mockResolvedValue(4);

      const result = await service.refillOneTimePreKeys('userA', 'dev1', {
        keys,
      });

      expect(oneTimePreKeyRepository.addBatch).toHaveBeenCalledWith(
        'dev1',
        keys,
      );
      expect(result).toEqual({ added: 1, available: 4 });
    });

    it('should reject an oversized refill batch', async () => {
      const oversized = {
        keys: Array.from({ length: 101 }, (_, i) => ({
          preKeyId: i,
          publicKey: `k${i}`,
        })),
      };

      await expect(
        service.refillOneTimePreKeys('userA', 'dev1', oversized as any),
      ).rejects.toThrow(BadRequestException);
      expect(oneTimePreKeyRepository.addBatch).not.toHaveBeenCalled();
    });

    it('should reject refill for a non-owned device', async () => {
      deviceRepository.findActiveById.mockResolvedValue(null);

      await expect(
        service.refillOneTimePreKeys('userA', 'dev1', { keys } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('should revoke an owned device', async () => {
      deviceRepository.findActiveById.mockResolvedValue(device);

      await service.revoke('userA', 'dev1');

      expect(deviceRepository.markRevoked).toHaveBeenCalledWith('dev1');
    });

    it('should reject revocation of another users device', async () => {
      deviceRepository.findActiveById.mockResolvedValue({
        ...device,
        userId: 'userB',
      });

      await expect(service.revoke('userA', 'dev1')).rejects.toThrow(
        NotFoundException,
      );
      expect(deviceRepository.markRevoked).not.toHaveBeenCalled();
    });
  });
});
