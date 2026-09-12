import { E2eeSessionController } from './e2ee-session.controller';

describe('E2eeSessionController', () => {
  let controller: E2eeSessionController;
  let command: { establishSession: jest.Mock; acceptSession: jest.Mock };
  let query: { getSessionById: jest.Mock; listSessionsForDevice: jest.Mock };

  beforeEach(() => {
    command = { establishSession: jest.fn(), acceptSession: jest.fn() };
    query = { getSessionById: jest.fn(), listSessionsForDevice: jest.fn() };
    controller = new E2eeSessionController(command as any, query as any);
  });

  it('should establish session with the explicit sender device from the DTO', async () => {
    command.establishSession.mockResolvedValue({
      sessionId: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
    });
    const dto = {
      senderDeviceId: 'dev1',
      recipientUserId: 'userB',
      recipientDeviceId: 'dev2',
    };

    const result = await controller.establishSession('userA', dto);

    expect(command.establishSession).toHaveBeenCalledWith('userA', dto);
    expect(result.sessionId).toBe('sess1');
  });

  it('should accept session with the explicit recipient device from the DTO', async () => {
    command.acceptSession.mockResolvedValue({
      sessionId: 'sess1',
      senderDeviceId: 'dev1',
      recipientDeviceId: 'dev2',
    });
    const dto = { sessionId: 'sess1', recipientDeviceId: 'dev2' };

    const result = await controller.acceptSession('userB', dto);

    expect(command.acceptSession).toHaveBeenCalledWith('userB', dto);
    expect(result.sessionId).toBe('sess1');
  });

  it('should get session by id scoped to the caller', async () => {
    query.getSessionById.mockResolvedValue({ sessionId: 'sess1' });

    const result = await controller.getSession('userA', 'sess1');

    expect(query.getSessionById).toHaveBeenCalledWith('sess1', 'userA');
    expect(result.sessionId).toBe('sess1');
  });

  it('should list device sessions scoped to the caller', async () => {
    query.listSessionsForDevice.mockResolvedValue([{ sessionId: 'sess1' }]);

    const result = await controller.listDeviceSessions('userA', 'dev1');

    expect(query.listSessionsForDevice).toHaveBeenCalledWith('dev1', 'userA');
    expect(result).toHaveLength(1);
  });
});
