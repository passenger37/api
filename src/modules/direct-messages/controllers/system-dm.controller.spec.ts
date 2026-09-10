import { SystemDmController } from './system-dm.controller';

describe('SystemDmController', () => {
  let controller: SystemDmController;
  let systemDmService: any;

  beforeEach(() => {
    systemDmService = {
      send: jest.fn(),
    };

    controller = new SystemDmController(systemDmService);
  });

  it('should route a system dm to the target user', async () => {
    systemDmService.send.mockResolvedValue({
      message: { id: 'm1' },
      deduplicated: false,
    });

    const result = await controller.send('u1', {
      targetUserId: 'u2',
      content: 'hello',
      clientMessageId: 'cm1',
    });

    expect(systemDmService.send).toHaveBeenCalledWith(
      'u1',
      'u2',
      'hello',
      'cm1',
    );
    expect(result).toEqual({ message: { id: 'm1' }, deduplicated: false });
  });

  it('should allow a system dm without a client message id', async () => {
    systemDmService.send.mockResolvedValue({
      message: { id: 'm2' },
      deduplicated: false,
    });

    await controller.send('u1', {
      targetUserId: 'u2',
      content: 'hello',
    });

    expect(systemDmService.send).toHaveBeenCalledWith(
      'u1',
      'u2',
      'hello',
      undefined,
    );
  });
});
