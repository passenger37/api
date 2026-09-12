import { DirectMessageController } from './direct-message.controller';

describe('DirectMessageController', () => {
  let controller: DirectMessageController;
  let commandService: any;
  let queryService: any;
  let e2eeCommandService: any;
  let reactionQueryService: any;
  let reactionCommandService: any;
  let attachmentService: any;

  beforeEach(() => {
    commandService = {
      open: jest.fn(),
      markRead: jest.fn(),
      updateSettings: jest.fn(),
      edit: jest.fn(),
      delete: jest.fn(),
    };
    queryService = {
      getChannel: jest.fn(),
      listChannels: jest.fn(),
      getHistory: jest.fn(),
    };
    e2eeCommandService = {
      sendText: jest.fn(),
    };
    reactionQueryService = {
      getReactions: jest.fn(),
    };
    reactionCommandService = {
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
    };
    attachmentService = {
      requestUpload: jest.fn(),
      confirmUpload: jest.fn(),
      getDownloadUrl: jest.fn(),
    };

    controller = new DirectMessageController(
      commandService,
      queryService,
      e2eeCommandService,
      reactionQueryService,
      reactionCommandService,
      attachmentService,
    );
  });

  it('should open a channel and surface it to the opener', async () => {
    commandService.open.mockResolvedValue({
      id: 'dm1',
      userAId: 'u1',
      userBId: 'u2',
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });

    const result = await controller.open('u1', { targetUserId: 'u2' });

    expect(commandService.open).toHaveBeenCalledWith('u1', 'u2');
    expect(queryService.getChannel).toHaveBeenCalledWith('dm1', 'u1');
    expect(result).toEqual({ id: 'dm1' });
  });

  it('should relay an E2EE message with the channel id from the path', async () => {
    e2eeCommandService.sendText.mockResolvedValue({
      message: { id: 'msg1', isE2ee: true },
      envelopes: [],
      deduplicated: false,
    });
    const request = {
      senderDeviceId: 'dev1',
      protocolVersion: 1,
      envelopes: [],
    };

    const result = await controller.sendE2eeMessage(
      'dm1',
      'u1',
      request as any,
    );

    expect(e2eeCommandService.sendText).toHaveBeenCalledWith('u1', {
      ...request,
      channelId: 'dm1',
    });
    expect(result.message.isE2ee).toBe(true);
  });

  it('should list the viewers channels', async () => {
    queryService.listChannels.mockResolvedValue([{ id: 'dm1' }]);

    const result = await controller.list('u1', {
      cursor: 'c1',
      limit: 25,
    });

    expect(queryService.listChannels).toHaveBeenCalledWith('u1', 'c1', 25);
    expect(result).toEqual([{ id: 'dm1' }]);
  });

  it('should default the list limit to 50', async () => {
    await controller.list('u1', {});

    expect(queryService.listChannels).toHaveBeenCalledWith('u1', undefined, 50);
  });

  it('should return a single channel', async () => {
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });

    const result = await controller.getChannel('dm1', 'u1');

    expect(queryService.getChannel).toHaveBeenCalledWith('dm1', 'u1');
    expect(result).toEqual({ id: 'dm1' });
  });

  it('should return message history', async () => {
    queryService.getHistory.mockResolvedValue([{ id: 'm1' }]);

    const result = await controller.getMessages('dm1', 'u1', {
      cursor: 'c1',
      limit: 25,
    });

    expect(queryService.getHistory).toHaveBeenCalledWith('dm1', 'u1', 'c1', 25);
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('should mark a channel read', async () => {
    commandService.markRead.mockResolvedValue({ unreadCount: 0 });

    const result = await controller.markRead('dm1', 'u1', {
      lastReadMessageId: 'm9',
    } as any);

    expect(commandService.markRead).toHaveBeenCalledWith('dm1', 'u1', 'm9');
    expect(result).toEqual({ unreadCount: 0 });
  });

  it('should update conversation settings', async () => {
    commandService.updateSettings.mockResolvedValue({ isMuted: true });

    const result = await controller.updateSettings('dm1', 'u1', {
      isMuted: true,
    });

    expect(commandService.updateSettings).toHaveBeenCalledWith('dm1', 'u1', {
      isMuted: true,
    });
    expect(result).toEqual({ isMuted: true });
  });

  it('should edit a message', async () => {
    commandService.edit.mockResolvedValue({ id: 'm1', version: 2 });

    const result = await controller.editMessage('m1', 'u1', {
      content: 'new',
      expectedVersion: 1,
    } as any);

    expect(commandService.edit).toHaveBeenCalledWith('m1', 'u1', 'new', 1);
    expect(result).toEqual({ id: 'm1', version: 2 });
  });

  it('should delete a message', async () => {
    commandService.delete.mockResolvedValue({ success: true, messageId: 'm1' });

    const result = await controller.deleteMessage('m1', 'u1');

    expect(commandService.delete).toHaveBeenCalledWith('m1', 'u1');
    expect(result).toEqual({ success: true, messageId: 'm1' });
  });

  it('should return a messages reactions', async () => {
    reactionQueryService.getReactions.mockResolvedValue([
      { emoji: '🔥', count: 1, reactedByViewer: true },
    ]);

    const result = await controller.getReactions('m1', 'u1');

    expect(reactionQueryService.getReactions).toHaveBeenCalledWith('m1', 'u1');
    expect(result).toEqual([{ emoji: '🔥', count: 1, reactedByViewer: true }]);
  });

  it('should add a reaction', async () => {
    reactionCommandService.addReaction.mockResolvedValue({
      messageId: 'm1',
      userId: 'u1',
      emoji: '🔥',
    });

    const result = await controller.addReaction('m1', 'u1', {
      emoji: '🔥',
    } as any);

    expect(reactionCommandService.addReaction).toHaveBeenCalledWith(
      'm1',
      'u1',
      '🔥',
    );
    expect(result).toEqual({ messageId: 'm1', userId: 'u1', emoji: '🔥' });
  });

  it('should remove a reaction', async () => {
    reactionCommandService.removeReaction.mockResolvedValue({
      messageId: 'm1',
      userId: 'u1',
      emoji: '🔥',
    });

    const result = await controller.removeReaction('m1', 'u1', {
      emoji: '🔥',
    } as any);

    expect(reactionCommandService.removeReaction).toHaveBeenCalledWith(
      'm1',
      'u1',
      '🔥',
    );
    expect(result).toEqual({ messageId: 'm1', userId: 'u1', emoji: '🔥' });
  });

  it('should request an attachment upload', async () => {
    attachmentService.requestUpload.mockResolvedValue({
      attachmentId: 'att1',
      uploadUrl: 'https://s3/signed',
    });

    const result = await controller.requestUpload('dm1', 'u1', {
      fileName: 'a.png',
      mimeType: 'image/png',
      sizeBytes: 100,
    });

    expect(attachmentService.requestUpload).toHaveBeenCalledWith('dm1', 'u1', {
      fileName: 'a.png',
      mimeType: 'image/png',
      sizeBytes: 100,
    });
    expect(result).toEqual({
      attachmentId: 'att1',
      uploadUrl: 'https://s3/signed',
    });
  });

  it('should confirm an attachment upload', async () => {
    attachmentService.confirmUpload.mockResolvedValue({
      attachmentId: 'att1',
      status: 'UPLOADED',
    });

    const result = await controller.confirmUpload('dm1', 'att1', 'u1');

    expect(attachmentService.confirmUpload).toHaveBeenCalledWith(
      'dm1',
      'att1',
      'u1',
    );
    expect(result).toEqual({ attachmentId: 'att1', status: 'UPLOADED' });
  });

  it('should resolve a download url in attachment mode by default', async () => {
    attachmentService.getDownloadUrl.mockResolvedValue({ url: 'https://s3/g' });

    const result = await controller.getAttachmentUrl('dm1', 'att1', 'u1');

    expect(attachmentService.getDownloadUrl).toHaveBeenCalledWith(
      'dm1',
      'att1',
      'u1',
      'attachment',
    );
    expect(result).toEqual({ url: 'https://s3/g' });
  });

  it('should pass through an inline disposition', async () => {
    const result = await controller.getAttachmentUrl(
      'dm1',
      'att1',
      'u1',
      'inline',
    );

    expect(attachmentService.getDownloadUrl).toHaveBeenCalledWith(
      'dm1',
      'att1',
      'u1',
      'inline',
    );
    expect(result).toBeUndefined();
  });
});
