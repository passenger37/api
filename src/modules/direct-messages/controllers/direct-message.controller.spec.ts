import { DirectMessageController } from './direct-message.controller';

describe('DirectMessageController', () => {
  let controller: DirectMessageController;
  let commandService: any;
  let queryService: any;

  beforeEach(() => {
    commandService = {
      open: jest.fn(),
      markRead: jest.fn(),
    };
    queryService = {
      getChannel: jest.fn(),
      listChannels: jest.fn(),
      getHistory: jest.fn(),
    };

    controller = new DirectMessageController(commandService, queryService);
  });

  it('should open a channel and surface it to the opener', async () => {
    commandService.open.mockResolvedValue({
      id: 'dm1',
      userAId: 'u1',
      userBId: 'u2',
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });

    const result = await controller.open('u1', { targetUserId: 'u2' } as any);

    expect(commandService.open).toHaveBeenCalledWith('u1', 'u2');
    expect(queryService.getChannel).toHaveBeenCalledWith('dm1', 'u1');
    expect(result).toEqual({ id: 'dm1' });
  });

  it('should list the viewers channels', async () => {
    queryService.listChannels.mockResolvedValue([{ id: 'dm1' }]);

    const result = await controller.list('u1', {
      cursor: 'c1',
      limit: 25,
    } as any);

    expect(queryService.listChannels).toHaveBeenCalledWith('u1', 'c1', 25);
    expect(result).toEqual([{ id: 'dm1' }]);
  });

  it('should default the list limit to 50', async () => {
    await controller.list('u1', {} as any);

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
    } as any);

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
});
