import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AttachmentValidationService } from '../../messages/services/attachment-validation.service';
import { DmAttachmentService } from './dm-attachment.service';

const validPolicy = {
  fileName: 'photo.png',
  mimeType: 'image/png',
  sizeBytes: 100,
};

describe('DmAttachmentService', () => {
  let service: DmAttachmentService;
  let queryService: any;
  let storage: any;
  let repository: any;
  let spamControl: any;

  beforeEach(() => {
    queryService = { getChannel: jest.fn() };
    storage = {
      createPresignedPutUrl: jest.fn().mockResolvedValue('https://put'),
      createPresignedGetUrl: jest.fn().mockResolvedValue('https://get'),
      objectSize: jest.fn(),
      publicUrl: jest.fn().mockReturnValue(null),
    };
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      countPending: jest.fn(),
      markUploaded: jest.fn(),
      attachToMessage: jest.fn(),
    };
    spamControl = {
      checkUploadRequest: jest.fn().mockResolvedValue(undefined),
    };

    service = new DmAttachmentService(
      queryService,
      storage,
      new AttachmentValidationService(),
      repository,
      spamControl,
    );
  });

  describe('requestUpload', () => {
    it('should require an accessible channel', async () => {
      queryService.getChannel.mockRejectedValue(
        new NotFoundException('Direct message channel not found.'),
      );

      await expect(
        service.requestUpload('dm1', 'u1', validPolicy),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject unsupported mime types', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });

      await expect(
        service.requestUpload('dm1', 'u1', {
          ...validPolicy,
          mimeType: 'application/x-msdownload',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject when pending uploads are exhausted', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.countPending.mockResolvedValue(
        AttachmentValidationService.MAX_PENDING_ATTACHMENTS_PER_CHANNEL,
      );

      await expect(
        service.requestUpload('dm1', 'u1', validPolicy),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should create a pending record and hand back a signed URL', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.countPending.mockResolvedValue(0);
      repository.create.mockResolvedValue({
        id: 'att1',
        mimeType: 'image/png',
        sizeBytes: 100,
      });

      const result = await service.requestUpload('dm1', 'u1', validPolicy);

      expect(spamControl.checkUploadRequest).toHaveBeenCalledWith('u1');
      expect(storage.createPresignedPutUrl).toHaveBeenCalledWith(
        expect.stringMatching(/dm-attachments\/dm1\/[0-9a-f-]+_photo\.png/),
        'image/png',
      );
      expect(result.attachmentId).toBe('att1');
      expect(result.uploadUrl).toBe('https://put');
    });
  });

  describe('confirmUpload', () => {
    it('should reject an attachment from another channel', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm-other',
      });

      await expect(
        service.confirmUpload('dm1', 'att1', 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject a confirm from a non-uploader', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm1',
        uploadedById: 'u2',
        status: 'PENDING',
      });

      await expect(
        service.confirmUpload('dm1', 'att1', 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject when the stored size disagrees with the upload', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm1',
        uploadedById: 'u1',
        status: 'PENDING',
        sizeBytes: 100,
      });
      storage.objectSize.mockResolvedValue(512);

      await expect(
        service.confirmUpload('dm1', 'att1', 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should mark the attachment uploaded on an exact size match', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm1',
        uploadedById: 'u1',
        status: 'PENDING',
        sizeBytes: 100,
      });
      storage.objectSize.mockResolvedValue(100);
      repository.markUploaded.mockResolvedValue({
        id: 'att1',
        status: 'UPLOADED',
      });

      const result = await service.confirmUpload('dm1', 'att1', 'u1');

      expect(repository.markUploaded).toHaveBeenCalledWith('att1', 100);
      expect(result.status).toBe('UPLOADED');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return a signed URL for an uploaded attachment', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm1',
        storageKey: 'dm-attachments/dm1/att1_photo.png',
        mimeType: 'image/png',
        fileName: 'photo.png',
        sizeBytes: 100,
        status: 'UPLOADED',
      });

      const result = await service.getDownloadUrl('dm1', 'att1', 'u1');

      expect(storage.createPresignedGetUrl).toHaveBeenCalledWith(
        'dm-attachments/dm1/att1_photo.png',
        'image/png',
        'photo.png',
        'attachment',
      );
      expect(result.url).toBe('https://get');
    });

    it('should prefer the public base URL when configured', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm1',
        storageKey: 'dm-attachments/dm1/att1_photo.png',
        mimeType: 'image/png',
        fileName: 'photo.png',
        sizeBytes: 100,
        status: 'UPLOADED',
      });
      storage.publicUrl.mockReturnValue('https://public/dm-attachments/x.png');

      const result = await service.getDownloadUrl('dm1', 'att1', 'u1');

      expect(storage.createPresignedGetUrl).not.toHaveBeenCalled();
      expect(result.url).toBe('https://public/dm-attachments/x.png');
    });

    it('should reject URLs for unconfirmed attachments', async () => {
      queryService.getChannel.mockResolvedValue({ id: 'dm1' });
      repository.findById.mockResolvedValue({
        id: 'att1',
        channelId: 'dm1',
        status: 'PENDING',
      });

      await expect(
        service.getDownloadUrl('dm1', 'att1', 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('attachToMessage', () => {
    it('should throw when claimed counts do not match', async () => {
      repository.attachToMessage.mockResolvedValue({ count: 1 });

      await expect(
        service.attachToMessage('m1', 'dm1', 'u1', ['a', 'b']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should no-op for empty attachment lists', async () => {
      await service.attachToMessage('m1', 'dm1', 'u1', []);

      expect(repository.attachToMessage).not.toHaveBeenCalled();
    });

    it('should pass through a transaction client', async () => {
      repository.attachToMessage.mockResolvedValue({ count: 2 });
      const tx = { directMessageAttachment: {} };

      await service.attachToMessage('m1', 'dm1', 'u1', ['a', 'b'], tx as any);

      expect(repository.attachToMessage).toHaveBeenCalledWith(
        'm1',
        'dm1',
        'u1',
        ['a', 'b'],
        tx,
      );
    });
  });
});
