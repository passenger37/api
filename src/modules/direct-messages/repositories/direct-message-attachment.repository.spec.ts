import { DirectMessageAttachmentRepository } from './direct-message-attachment.repository';

describe('DirectMessageAttachmentRepository', () => {
  let repository: DirectMessageAttachmentRepository;
  let prisma: {
    directMessageAttachment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      directMessageAttachment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
    };
    repository = new DirectMessageAttachmentRepository(prisma as any);
  });

  it('should create a pending attachment', async () => {
    const data = {
      id: 'att1',
      channelId: 'dm1',
      uploadedById: 'u1',
      fileName: 'a.png',
      mimeType: 'image/png',
      sizeBytes: 10,
      storageKey: 'dm-attachments/dm1/att1_a.png',
    };

    await repository.create(data);

    expect(prisma.directMessageAttachment.create).toHaveBeenCalledWith({
      data,
    });
  });

  it('should find an attachment by id', async () => {
    await repository.findById('att1');

    expect(prisma.directMessageAttachment.findUnique).toHaveBeenCalledWith({
      where: { id: 'att1' },
    });
  });

  it('should count pending uploads bound to a channel and uploader', async () => {
    await repository.countPending('dm1', 'u1');

    expect(prisma.directMessageAttachment.count).toHaveBeenCalledWith({
      where: { channelId: 'dm1', uploadedById: 'u1', status: 'PENDING' },
    });
  });

  it('should mark an attachment uploaded', async () => {
    await repository.markUploaded('att1', 100);

    expect(prisma.directMessageAttachment.update).toHaveBeenCalledWith({
      where: { id: 'att1' },
      data: { status: 'UPLOADED', sizeBytes: 100 },
    });
  });

  it('should attach claimed uploads to a message', async () => {
    prisma.directMessageAttachment.updateMany.mockResolvedValue({ count: 2 });

    const result = await repository.attachToMessage('m1', 'dm1', 'u1', [
      'att1',
      'att2',
    ]);

    expect(prisma.directMessageAttachment.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['att1', 'att2'] },
        channelId: 'dm1',
        uploadedById: 'u1',
        status: 'UPLOADED',
        messageId: null,
      },
      data: { messageId: 'm1' },
    });
    expect(result.count).toBe(2);
  });

  it('should list uploaded attachments by message ids', async () => {
    await repository.findByMessageIds(['m1']);

    expect(prisma.directMessageAttachment.findMany).toHaveBeenCalledWith({
      where: { messageId: { in: ['m1'] }, status: 'UPLOADED' },
      orderBy: { createdAt: 'asc' },
    });
  });
});
