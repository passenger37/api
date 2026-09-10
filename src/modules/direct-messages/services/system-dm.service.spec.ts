import { SystemDmService } from './system-dm.service';

describe('SystemDmService', () => {
  let service: SystemDmService;
  let commandService: any;

  beforeEach(() => {
    commandService = {
      open: jest.fn(),
      send: jest.fn(),
    };

    service = new SystemDmService(commandService);
  });

  it('should open a channel with the target and send the message on behalf of the sender', async () => {
    commandService.open.mockResolvedValue({ id: 'dm1' });
    commandService.send.mockResolvedValue({
      message: { id: 'm1' },
      deduplicated: false,
    });

    const result = await service.send('u1', 'u2', 'hello', 'cm1');

    expect(commandService.open).toHaveBeenCalledWith('u1', 'u2');
    expect(commandService.send).toHaveBeenCalledWith(
      'dm1',
      'u1',
      'hello',
      'cm1',
    );
    expect(result).toEqual({ message: { id: 'm1' }, deduplicated: false });
  });

  it('should forward the message without a client message id', async () => {
    commandService.open.mockResolvedValue({ id: 'dm2' });

    await service.send('u1', 'u2', 'hello');

    expect(commandService.send).toHaveBeenCalledWith(
      'dm2',
      'u1',
      'hello',
      undefined,
    );
  });
});
