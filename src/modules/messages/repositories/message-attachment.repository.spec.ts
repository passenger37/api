import { MessageAttachmentRepository } from './message-attachment.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('MessageAttachmentRepository', () => {
  let repository: MessageAttachmentRepository;
  let prisma: {
    messageAttachment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let tx: { messageAttachment: { updateMany: jest.Mock } };

  beforeEach(() => {
    prisma = {
      messageAttachment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    tx = { messageAttachment: { updateMany: jest.fn() } };
    repository = new MessageAttachmentRepository(prisma as any);
  });

  it('should create an attachment with the given data', async () => {
    const data = {
      id: 'att-1',
      serverId: 'srv-1',
      channelId: 'ch1',
      uploadedById: 'member-1',
      fileName: 'cat.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      storageKey: 'attachments/srv-1/ch1/att-1_cat.png',
      status: 'PENDING' as const,
    };
    prisma.messageAttachment.create.mockResolvedValue(data);

    const result = await repository.create(data);

    expect(prisma.messageAttachment.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(data);
  });

  it('should find an attachment by id', async () => {
    prisma.messageAttachment.findUnique.mockResolvedValue({ id: 'att-1' });

    const result = await repository.findById('att-1');

    expect(prisma.messageAttachment.findUnique).toHaveBeenCalledWith({
      where: { id: 'att-1' },
    });
    expect(result).toEqual({ id: 'att-1' });
  });

  it('should count pending attachments for a channel and uploader', async () => {
    prisma.messageAttachment.count.mockResolvedValue(3);

    const result = await repository.countPending('ch1', 'member-1');

    expect(prisma.messageAttachment.count).toHaveBeenCalledWith({
      where: { channelId: 'ch1', uploadedById: 'member-1', status: 'PENDING' },
    });
    expect(result).toBe(3);
  });

  it('should mark an attachment uploaded with its confirmed size', async () => {
    prisma.messageAttachment.update.mockResolvedValue({ id: 'att-1' });

    await repository.markUploaded('att-1', 2048);

    expect(prisma.messageAttachment.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: { status: 'UPLOADED', sizeBytes: 2048 },
    });
  });

  it('should attach ready attachments owned by the uploader in the channel', async () => {
    prisma.messageAttachment.updateMany.mockResolvedValue({ count: 2 });

    const result = await repository.attachToMessage(
      'msg-1',
      'ch1',
      'member-1',
      ['a', 'b'],
    );

    expect(prisma.messageAttachment.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['a', 'b'] },
        channelId: 'ch1',
        uploadedById: 'member-1',
        status: 'UPLOADED',
        messageId: null,
      },
      data: { messageId: 'msg-1' },
    });
    expect(result).toEqual({ count: 2 });
  });

  it('should attach within the provided transaction client', async () => {
    tx.messageAttachment.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.attachToMessage(
      'msg-1',
      'ch1',
      'member-1',
      ['a'],
      tx as any,
    );

    expect(tx.messageAttachment.updateMany).toHaveBeenCalled();
    expect(result).toEqual({ count: 1 });
  });
});
