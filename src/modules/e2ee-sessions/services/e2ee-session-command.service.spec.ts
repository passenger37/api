import { E2eeSessionCommandService } from './e2ee-session-command.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('E2eeSessionCommandService', () => {
  let service: E2eeSessionCommandService;
  let sessionRepo: {
    findActiveByDevicePair: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
  };
  let keyDistQuery: { getKeyBundles: jest.Mock };
  let oneTimePreKeyRepo: { consumeNext: jest.Mock };

  beforeEach(() => {
    sessionRepo = {
      findActiveByDevicePair: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    keyDistQuery = { getKeyBundles: jest.fn() };
    oneTimePreKeyRepo = { consumeNext: jest.fn() };

    service = new E2eeSessionCommandService(
      sessionRepo as any,
      keyDistQuery as any,
      oneTimePreKeyRepo as any,
    );
  });

  describe('establishSession', () => {
    const dto = {
      recipientUserId: 'userB',
      recipientDeviceId: 'dev2',
      senderIdentityKey: 'ik1',
      senderEphemeralKey: 'ek1',
    };

    it('should throw NotFoundException when recipient device not found', async () => {
      keyDistQuery.getKeyBundles.mockResolvedValue({ devices: [] });

      await expect(
        service.establishSession('userA', 'dev1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when active session already exists', async () => {
      keyDistQuery.getKeyBundles.mockResolvedValue({
        devices: [
          {
            deviceId: 'dev2',
            identityKeyPublic: 'ik2',
            signedPrekey: {
              signedPreKeyId: 1,
              publicKey: 'spk',
              signature: 'sig',
            },
            oneTimePrekeyCount: 3,
          },
        ],
      });
      sessionRepo.findActiveByDevicePair.mockResolvedValue({ id: 'sess1' });

      await expect(
        service.establishSession('userA', 'dev1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when one-time prekey not available', async () => {
      keyDistQuery.getKeyBundles.mockResolvedValue({
        devices: [
          {
            deviceId: 'dev2',
            identityKeyPublic: 'ik2',
            signedPrekey: {
              signedPreKeyId: 1,
              publicKey: 'spk',
              signature: 'sig',
            },
            oneTimePrekeyCount: 3,
          },
        ],
      });
      sessionRepo.findActiveByDevicePair.mockResolvedValue(null);
      oneTimePreKeyRepo.consumeNext.mockResolvedValue(null);

      await expect(
        service.establishSession('userA', 'dev1', {
          ...dto,
          oneTimePrekeyId: '99',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create session and return keys', async () => {
      keyDistQuery.getKeyBundles.mockResolvedValue({
        devices: [
          {
            deviceId: 'dev2',
            identityKeyPublic: 'ik2',
            signedPrekey: {
              signedPreKeyId: 1,
              publicKey: 'spk',
              signature: 'sig',
            },
            oneTimePrekeyCount: 3,
          },
        ],
      });
      sessionRepo.findActiveByDevicePair.mockResolvedValue(null);
      oneTimePreKeyRepo.consumeNext.mockResolvedValue({
        preKeyId: 5,
        publicKey: 'opk5',
      });
      sessionRepo.create.mockResolvedValue({
        id: 'sess1',
        sessionState: 'state',
        associatedDataHash: 'hash',
      });

      const result = await service.establishSession('userA', 'dev1', dto);

      expect(sessionRepo.create).toHaveBeenCalled();
      expect(result).toEqual({
        sessionId: 'sess1',
        rootKeyCiphertext: 'state',
        chainKeyCiphertext: 'hash',
        senderEphemeralPublic: 'ek1',
      });
    });
  });

  describe('acceptSession', () => {
    const dto = {
      sessionId: 'sess1',
      senderEphemeralPublic: 'ek1',
      senderIdentityKey: 'ik1',
      recipientIdentityKey: 'ik2',
    };

    it('should throw NotFoundException when session not found', async () => {
      sessionRepo.findById.mockResolvedValue(null);

      await expect(service.acceptSession('dev2', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when session belongs to different device', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev3',
      });

      await expect(service.acceptSession('dev2', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create accepted session and return keys', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
      });
      sessionRepo.create.mockResolvedValue({
        id: 'sess2',
        sessionState: 'state2',
        associatedDataHash: 'hash2',
      });

      const result = await service.acceptSession('dev2', dto);

      expect(sessionRepo.create).toHaveBeenCalled();
      expect(result).toEqual({
        sessionId: 'sess2',
        rootKeyCiphertext: 'state2',
        chainKeyCiphertext: 'hash2',
        senderEphemeralPublic: 'ek1',
      });
    });
  });
});
