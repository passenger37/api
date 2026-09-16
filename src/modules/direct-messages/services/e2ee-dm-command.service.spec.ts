import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DirectMessageMode } from '@prisma/client';

import { E2eeDmCommandService } from './e2ee-dm-command.service';

describe('E2eeDmCommandService (security: ciphertext-only transport)', () => {
  let service: E2eeDmCommandService;
  let prisma: { $transaction: jest.Mock };
  let channelRepository: any;
  let messageRepository: any;
  let envelopeRepo: any;
  let sessionRepo: any;
  let deviceRepo: any;
  let dmCommandService: any;
  let e2eeAttachmentService: any;
  let gateway: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const channel = {
    id: 'dm1',
    userAId: 'userA',
    userBId: 'userB',
    mode: DirectMessageMode.PRIVATE_E2EE,
  };

  const senderDevice = { id: 'devA', userId: 'userA', isRevoked: false };
  const recipientDevice = { id: 'devB', userId: 'userB', isRevoked: false };

  const session = {
    id: 'sess1',
    senderDeviceId: 'devA',
    recipientDeviceId: 'devB',
    isActive: true,
    senderDevice: { userId: 'userA' },
    recipientDevice: { userId: 'userB' },
  };

  const request = {
    channelId: 'dm1',
    senderDeviceId: 'devA',
    protocolVersion: 1,
    clientMessageId: 'client-1',
    envelopes: [
      {
        recipientDeviceId: 'devB',
        sessionId: 'sess1',
        type: 'PRE_KEY' as const,
        ciphertext: 'opaque-ciphertext',
      },
    ],
  };

  beforeEach(() => {
    prisma = { $transaction: jest.fn() };
    channelRepository = {
      findById: jest.fn(),
      incrementCounterAndTouch: jest.fn(),
    };
    messageRepository = { findByClientMessageId: jest.fn(), create: jest.fn() };
    envelopeRepo = { findByClientMessageId: jest.fn(), create: jest.fn() };
    sessionRepo = { findById: jest.fn() };
    deviceRepo = { findById: jest.fn() };
    dmCommandService = { assertNotBlockedForChannel: jest.fn() };
    e2eeAttachmentService = { createAttachment: jest.fn(), linkMessage: jest.fn() };
    gateway = {
      broadcastE2eeMessageCreated: jest.fn(),
    };

    service = new E2eeDmCommandService(
      prisma as any,
      channelRepository,
      messageRepository,
      envelopeRepo,
      sessionRepo,
      deviceRepo,
      e2eeAttachmentService,
      dmCommandService,
      gateway,
    );

    channelRepository.findById.mockResolvedValue(channel);
    deviceRepo.findById.mockImplementation((id) =>
      id === 'devA'
        ? Promise.resolve(senderDevice)
        : Promise.resolve(recipientDevice),
    );
    sessionRepo.findById.mockResolvedValue(session);
    messageRepository.create.mockImplementation((data) =>
      Promise.resolve({
        id: 'msg1',
        channelId: data.channel.connect.id,
        authorUserId: 'userA',
        content: data.content,
        isE2ee: data.isE2ee,
        senderDeviceId: data.senderDeviceId,
        protocolVersion: data.protocolVersion,
        clientMessageId: data.clientMessageId ?? null,
        parentMessageId: null,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        version: 1,
        messageSeq: 3,
        createdAt: now,
      }),
    );
    envelopeRepo.create.mockImplementation((data) =>
      Promise.resolve({ id: 'env1', ...data, createdAt: now }),
    );
    channelRepository.incrementCounterAndTouch.mockImplementation((id, at) =>
      Promise.resolve(3),
    );
    prisma.$transaction.mockImplementation(async (fn) => fn({}));
  });

  it('persists an empty-content message row and opaque ciphertext envelopes only', async () => {
    const result = await service.sendText('userA', request);

    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '',
        isE2ee: true,
        senderDeviceId: 'devA',
        protocolVersion: 1,
        clientMessageId: 'client-1',
      }),
      expect.anything(),
    );
    expect(envelopeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ciphertext: 'opaque-ciphertext',
        session: { connect: { id: 'sess1' } },
        recipientDevice: { connect: { id: 'devB' } },
        channelId: 'dm1',
        clientMessageId: 'client-1',
      }),
      expect.anything(),
    );
    expect(result.message.isE2ee).toBe(true);
    expect(result.deduplicated).toBe(false);
  });

  it('never stores or broadcasts the sender plaintext', async () => {
    await service.sendText('userA', request);

    const storedCreate = messageRepository.create.mock.calls[0][0];
    const envelopeCreates = envelopeRepo.create.mock.calls.map((c) => c[0]);
    const broadcastPayload =
      gateway.broadcastE2eeMessageCreated.mock.calls[0][1];

    expect(storedCreate.content).toBe('');
    expect(JSON.stringify(envelopeCreates)).not.toMatch(/plaintext/i);
    expect(broadcastPayload.message.content).toBe('');

    const serialized = JSON.stringify(broadcastPayload);
    expect(serialized).not.toMatch(/plaintext/i);
    expect(serialized).toContain('opaque-ciphertext');
  });

  it('broadcasts the created payload to the channel room with ciphertext only', async () => {
    await service.sendText('userA', request);

    expect(gateway.broadcastE2eeMessageCreated).toHaveBeenCalledWith('dm1', {
      message: expect.objectContaining({
        id: 'msg1',
        content: '',
        isE2ee: true,
      }),
      envelopes: expect.arrayContaining([
        expect.objectContaining({ ciphertext: 'opaque-ciphertext' }),
      ]),
    });
  });

  it('throws when the channel is not end-to-end encrypted', async () => {
    channelRepository.findById.mockResolvedValue({
      ...channel,
      mode: DirectMessageMode.STANDARD,
    });

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when the caller is not a channel member', async () => {
    await expect(service.sendText('mallory', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when the sender device is not owned by the caller', async () => {
    deviceRepo.findById.mockResolvedValue({ ...senderDevice, userId: 'other' });

    await expect(service.sendText('userA', request)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws when the sender device is revoked', async () => {
    deviceRepo.findById.mockResolvedValue({ ...senderDevice, isRevoked: true });

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('requires at least one envelope', async () => {
    await expect(
      service.sendText('userA', { ...request, envelopes: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate recipients inside a single batch', async () => {
    const dup = {
      ...request,
      envelopes: [
        request.envelopes[0],
        { ...request.envelopes[0], sessionId: 'sess2' },
      ],
    };

    await expect(service.sendText('userA', dup)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an envelope whose recipient is not the channel partner', async () => {
    deviceRepo.findById.mockImplementation((id) =>
      id === 'devA'
        ? Promise.resolve(senderDevice)
        : Promise.resolve({ ...recipientDevice, userId: 'mallory' }),
    );

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an envelope targeting a revoked recipient device', async () => {
    deviceRepo.findById.mockImplementation((id) =>
      id === 'devA'
        ? Promise.resolve(senderDevice)
        : Promise.resolve({ ...recipientDevice, isRevoked: true }),
    );

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a session that does not map the sender device', async () => {
    sessionRepo.findById.mockResolvedValue({
      ...session,
      senderDeviceId: 'devX',
    });

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a session that does not map the recipient device', async () => {
    sessionRepo.findById.mockResolvedValue({
      ...session,
      recipientDeviceId: 'devY',
    });

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an inactive session', async () => {
    sessionRepo.findById.mockResolvedValue({ ...session, isActive: false });

    await expect(service.sendText('userA', request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deduplicates a retried clientMessageId without creating new rows', async () => {
    messageRepository.findByClientMessageId.mockResolvedValue({
      id: 'msg1',
      channelId: 'dm1',
      authorUserId: 'userA',
      content: '',
      isE2ee: true,
      senderDeviceId: 'devA',
      protocolVersion: 1,
      clientMessageId: 'client-1',
      parentMessageId: null,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      version: 1,
      messageSeq: 3,
      createdAt: now,
    });
    envelopeRepo.findByClientMessageId.mockResolvedValue([
      {
        id: 'env1',
        sessionId: 'sess1',
        type: 'PRE_KEY',
        ciphertext: 'opaque-ciphertext',
        protocolVersion: 1,
        channelId: 'dm1',
        clientMessageId: 'client-1',
        senderDeviceId: 'devA',
        recipientDeviceId: 'devB',
        createdAt: now,
      },
    ]);

    const result = await service.sendText('userA', request);

    expect(result.deduplicated).toBe(true);
    expect(messageRepository.create).not.toHaveBeenCalled();
    expect(envelopeRepo.create).not.toHaveBeenCalled();
  });
});
