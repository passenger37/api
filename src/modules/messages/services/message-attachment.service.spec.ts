import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { MessageAttachmentService } from './message-attachment.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentValidationService } from './attachment-validation.service';
import { MessageAttachmentRepository } from '../repositories/message-attachment.repository';

describe('MessageAttachmentService', () => {
  let service: MessageAttachmentService;
  let validation: {
    validateSendPermission: jest.Mock;
    validateChannelAccess: jest.Mock;
  };
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let storage: {
    createPresignedPutUrl: jest.Mock;
    createPresignedGetUrl: jest.Mock;
    objectSize: jest.Mock;
    publicUrl: jest.Mock;
  };
  let attachmentValidation: {
    validateUploadPolicy: jest.Mock;
    sanitizeFileName: jest.Mock;
  };
  let repository: {
    findById: jest.Mock;
    create: jest.Mock;
    countPending: jest.Mock;
    markUploaded: jest.Mock;
    attachToMessage: jest.Mock;
  };

  beforeEach(async () => {
    validation = {
      validateSendPermission: jest.fn(),
      validateChannelAccess: jest.fn(),
    };
    memberQueryService = { getMemberOrThrow: jest.fn() };
    storage = {
      createPresignedPutUrl: jest.fn(),
      createPresignedGetUrl: jest.fn(),
      objectSize: jest.fn(),
      publicUrl: jest.fn(),
    };
    attachmentValidation = {
      validateUploadPolicy: jest.fn(),
      sanitizeFileName: jest.fn(),
    };
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
      countPending: jest.fn(),
      markUploaded: jest.fn(),
      attachToMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageAttachmentService,
        {
          provide: ChannelMessageValidationService,
          useValue: validation,
        },
        { provide: ServerMemberQueryService, useValue: memberQueryService },
        { provide: AttachmentStorageService, useValue: storage },
        {
          provide: AttachmentValidationService,
          useValue: attachmentValidation,
        },
        { provide: MessageAttachmentRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(MessageAttachmentService);
  });

  const baseAttachment = {
    id: 'att-1',
    serverId: 'srv-1',
    channelId: 'ch1',
    uploadedById: 'member-1',
    status: 'PENDING',
    fileName: 'cat.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    storageKey: 'attachments/srv-1/ch1/att-1_cat.png',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('requestUpload', () => {
    it('should issue a presigned PUT for an allowed upload', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'ch1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      attachmentValidation.validateUploadPolicy.mockReturnValue('cat.png');
      repository.countPending.mockResolvedValue(1);
      storage.createPresignedPutUrl.mockResolvedValue('https://upload/signed');
      repository.create.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'att-1' }),
      );

      const result = await service.requestUpload('srv-1', 'ch1', 'user-1', {
        fileName: 'cat.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
      });

      expect(validation.validateSendPermission).toHaveBeenCalledWith(
        'ch1',
        'user-1',
      );
      expect(storage.createPresignedPutUrl).toHaveBeenCalledWith(
        expect.stringContaining('attachments/srv-1/ch1/'),
        'image/png',
      );
      expect(result.attachmentId).toBe('att-1');
      expect(result.uploadUrl).toBe('https://upload/signed');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 'srv-1',
          channelId: 'ch1',
          uploadedById: 'member-1',
          status: 'PENDING',
          mimeType: 'image/png',
          sizeBytes: 1024,
        }),
      );
    });

    it('should reject a channel from another server', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'ch1',
        serverId: 'other-server',
      });

      await expect(
        service.requestUpload('srv-1', 'ch1', 'user-1', {
          fileName: 'cat.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when the pending limit is reached', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'ch1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      attachmentValidation.validateUploadPolicy.mockReturnValue('cat.png');
      repository.countPending.mockResolvedValue(10);

      await expect(
        service.requestUpload('srv-1', 'ch1', 'user-1', {
          fileName: 'cat.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(storage.createPresignedPutUrl).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload', () => {
    it('should mark the attachment uploaded when sizes match', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      repository.findById.mockResolvedValue(baseAttachment);
      storage.objectSize.mockResolvedValue(1024);
      repository.markUploaded.mockResolvedValue({
        ...baseAttachment,
        status: 'UPLOADED',
      });

      const result = await service.confirmUpload(
        'srv-1',
        'ch1',
        'att-1',
        'user-1',
      );

      expect(repository.markUploaded).toHaveBeenCalledWith('att-1', 1024);
      expect(result.status).toBe('UPLOADED');
    });

    it('should be idempotent when already uploaded', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      repository.findById.mockResolvedValue({
        ...baseAttachment,
        status: 'UPLOADED',
      });

      const result = await service.confirmUpload(
        'srv-1',
        'ch1',
        'att-1',
        'user-1',
      );

      expect(storage.objectSize).not.toHaveBeenCalled();
      expect(result.status).toBe('UPLOADED');
    });

    it('should reject an unknown attachment', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      repository.findById.mockResolvedValue(null);

      await expect(
        service.confirmUpload('srv-1', 'ch1', 'att-missing', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when the object is missing', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      repository.findById.mockResolvedValue(baseAttachment);
      storage.objectSize.mockResolvedValue(null);

      await expect(
        service.confirmUpload('srv-1', 'ch1', 'att-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when the uploaded size mismatches', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
      repository.findById.mockResolvedValue(baseAttachment);
      storage.objectSize.mockResolvedValue(2048);

      await expect(
        service.confirmUpload('srv-1', 'ch1', 'att-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(repository.markUploaded).not.toHaveBeenCalled();
    });

    it('should reject uploads by another member', async () => {
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'other-member',
      });
      repository.findById.mockResolvedValue(baseAttachment);

      await expect(
        service.confirmUpload('srv-1', 'ch1', 'att-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return a public URL when configured', async () => {
      validation.validateChannelAccess.mockResolvedValue({});
      repository.findById.mockResolvedValue({
        ...baseAttachment,
        status: 'UPLOADED',
      });
      storage.publicUrl.mockReturnValue(
        'https://cdn/attachments/srv-1/ch1/att-1_cat.png',
      );

      const result = await service.getDownloadUrl(
        'srv-1',
        'ch1',
        'att-1',
        'user-1',
      );

      expect(storage.createPresignedGetUrl).not.toHaveBeenCalled();
      expect(result.url).toBe(
        'https://cdn/attachments/srv-1/ch1/att-1_cat.png',
      );
    });

    it('should issue a presigned GET when no public base is configured', async () => {
      validation.validateChannelAccess.mockResolvedValue({});
      repository.findById.mockResolvedValue({
        ...baseAttachment,
        status: 'UPLOADED',
      });
      storage.publicUrl.mockReturnValue(null);
      storage.createPresignedGetUrl.mockResolvedValue('https://signed/get');

      const result = await service.getDownloadUrl(
        'srv-1',
        'ch1',
        'att-1',
        'user-1',
        'inline',
      );

      expect(storage.createPresignedGetUrl).toHaveBeenCalledWith(
        baseAttachment.storageKey,
        'image/png',
        'cat.png',
        'inline',
      );
      expect(result.url).toBe('https://signed/get');
    });

    it('should reject attachments that are not ready', async () => {
      validation.validateChannelAccess.mockResolvedValue({});
      repository.findById.mockResolvedValue(baseAttachment);

      await expect(
        service.getDownloadUrl('srv-1', 'ch1', 'att-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('attachToMessage', () => {
    it('should require an array', async () => {
      await expect(
        service.attachToMessage(
          'msg-1',
          'ch1',
          'member-1',
          'not-an-array' as unknown as string[],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should no-op for an empty list', async () => {
      await service.attachToMessage('msg-1', 'ch1', 'member-1', []);

      expect(repository.attachToMessage).not.toHaveBeenCalled();
    });

    it('should throw when not all attachments can be attached', async () => {
      repository.attachToMessage.mockResolvedValue({ count: 1 });

      await expect(
        service.attachToMessage('msg-1', 'ch1', 'member-1', ['a', 'b']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should attach all attachments on success', async () => {
      repository.attachToMessage.mockResolvedValue({ count: 2 });

      await service.attachToMessage('msg-1', 'ch1', 'member-1', ['a', 'b']);

      expect(repository.attachToMessage).toHaveBeenCalledWith(
        'msg-1',
        'ch1',
        'member-1',
        ['a', 'b'],
        undefined,
      );
    });
  });
});
