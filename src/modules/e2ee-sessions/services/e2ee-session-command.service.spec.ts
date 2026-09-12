import { E2eeSessionCommandService } from './e2ee-session-command.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('E2eeSessionCommandService', () => {
  let service: E2eeSessionCommandService;
  let sessionRepo: {
    findActiveByDevicePair: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    accept: jest.Mock;
    archive: jest.Mock;
  };
  let deviceRepo: { findById: jest.Mock };
  let signedPreKeyRepo: { findActive: jest.Mock };
  let oneTimePreKeyRepo: { consumeNext: jest.Mock };

  const senderDevice = { id: 'dev1', userId: 'userA', isRevoked: false };
  const recipientDevice = { id: 'dev2', userId: 'userB', isRevoked: false };

  beforeEach(() => {
    sessionRepo = {
      findActiveByDevicePair: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      accept: jest.fn(),
      archive: jest.fn(),
    };
    deviceRepo = { findById: jest.fn() };
    signedPreKeyRepo = { findActive: jest.fn() };
    oneTimePreKeyRepo = { consumeNext: jest.fn() };

    service = new E2eeSessionCommandService(
      sessionRepo as any,
      deviceRepo as any,
      signedPreKeyRepo as any,
      oneTimePreKeyRepo as any,
    );
  });

  describe('establishSession', () => {
    const dto = {
      senderDeviceId: 'dev1',
      recipientUserId: 'userB',
      recipientDeviceId: 'dev2',
    };

    beforeEach(() => {
      deviceRepo.findById.mockImplementation((id: string) => {
        if (id === senderDevice.id) return Promise.resolve(senderDevice);
        if (id === recipientDevice.id) return Promise.resolve(recipientDevice);
        return Promise.resolve(null);
      });
      signedPreKeyRepo.findActive.mockResolvedValue({
        publicKey: 'spk',
        signature: 'sig',
      });
      sessionRepo.findActiveByDevicePair.mockResolvedValue(null);
    });

    it('should throw ForbiddenException when sender device is missing or not owned by the caller', async () => {
      deviceRepo.findById.mockResolvedValue(null);
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        ForbiddenException,
      );

      deviceRepo.findById.mockResolvedValue({
        ...senderDevice,
        userId: 'mallory',
      });
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when sender device is revoked', async () => {
      deviceRepo.findById.mockResolvedValue({
        ...senderDevice,
        isRevoked: true,
      });
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when recipient device is missing', async () => {
      deviceRepo.findById.mockImplementation((id: string) =>
        Promise.resolve(id === senderDevice.id ? senderDevice : null),
      );
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when recipient device belongs to a different user', async () => {
      deviceRepo.findById.mockImplementation((id: string) =>
        Promise.resolve(
          id === senderDevice.id
            ? senderDevice
            : { ...recipientDevice, userId: 'mallory' },
        ),
      );
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when recipient device is revoked', async () => {
      deviceRepo.findById.mockImplementation((id: string) =>
        Promise.resolve(
          id === senderDevice.id
            ? senderDevice
            : { ...recipientDevice, isRevoked: true },
        ),
      );
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when recipient has no active signed prekey', async () => {
      signedPreKeyRepo.findActive.mockResolvedValue(null);
      await expect(service.establishSession('userA', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when the claimed OTPK is not available', async () => {
      oneTimePreKeyRepo.consumeNext.mockResolvedValue(null);
      await expect(
        service.establishSession('userA', { ...dto, oneTimePrekeyId: '99' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the claimed OTPK id does not match the consumed key', async () => {
      oneTimePreKeyRepo.consumeNext.mockResolvedValue({ preKeyId: 5 });
      await expect(
        service.establishSession('userA', { ...dto, oneTimePrekeyId: '99' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should archive an existing session and create a metadata-only replacement', async () => {
      sessionRepo.findActiveByDevicePair.mockResolvedValue({ id: 'sessOld' });
      sessionRepo.create.mockResolvedValue({
        id: 'sessNew',
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
      });

      const result = await service.establishSession('userA', dto);

      expect(sessionRepo.archive).toHaveBeenCalledWith('sessOld');
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          senderDevice: { connect: { id: 'dev1' } },
          recipientDevice: { connect: { id: 'dev2' } },
        }),
      );
      // Metadata-only contract: no server-side derived state is manufactured.
      expect(result).toEqual({
        sessionId: 'sessNew',
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
      });
      expect(result).not.toHaveProperty('rootKeyCiphertext');
      expect(result).not.toHaveProperty('chainKeyCiphertext');
    });

    it('should consume the OTPK when establishing with one', async () => {
      oneTimePreKeyRepo.consumeNext.mockResolvedValue({ preKeyId: 7 });
      sessionRepo.create.mockResolvedValue({
        id: 'sessNew',
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
      });

      await service.establishSession('userA', {
        ...dto,
        oneTimePrekeyId: '7',
      });

      expect(oneTimePreKeyRepo.consumeNext).toHaveBeenCalledWith('dev2');
    });
  });

  describe('acceptSession', () => {
    const dto = { sessionId: 'sess1', recipientDeviceId: 'dev2' };

    it('should throw NotFoundException when session not found', async () => {
      sessionRepo.findById.mockResolvedValue(null);
      await expect(service.acceptSession('userB', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when session targets a different device', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev3',
      });
      await expect(service.acceptSession('userB', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when the recipient device is not owned by the caller', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
      });
      deviceRepo.findById.mockResolvedValue({
        ...recipientDevice,
        userId: 'mallory',
      });
      await expect(service.acceptSession('userB', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when the recipient device is revoked', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
      });
      deviceRepo.findById.mockResolvedValue({
        ...recipientDevice,
        isRevoked: true,
      });
      await expect(service.acceptSession('userB', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should be idempotent when the session is already accepted', async () => {
      const acceptedAt = new Date('2026-01-01T00:00:00.000Z');
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
        acceptedAt,
      });
      deviceRepo.findById.mockResolvedValue(recipientDevice);

      const result = await service.acceptSession('userB', dto);

      expect(sessionRepo.accept).not.toHaveBeenCalled();
      expect(result.acceptedAt).toEqual(acceptedAt);
    });

    it('should mark the session accepted and return device ids', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'sess1',
        isActive: true,
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
        acceptedAt: null,
      });
      deviceRepo.findById.mockResolvedValue(recipientDevice);
      sessionRepo.accept.mockResolvedValue({
        id: 'sess1',
        senderDeviceId: 'dev1',
        recipientDeviceId: 'dev2',
        acceptedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      const result = await service.acceptSession('userB', dto);

      expect(sessionRepo.accept).toHaveBeenCalledWith('sess1');
      expect(result.sessionId).toBe('sess1');
      expect(result.senderDeviceId).toBe('dev1');
      expect(result.recipientDeviceId).toBe('dev2');
    });
  });
});
