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

  it('should establish session', async () => {
    command.establishSession.mockResolvedValue({
      sessionId: 'sess1',
      rootKeyCiphertext: 'rk',
      chainKeyCiphertext: 'ck',
      senderEphemeralPublic: 'ek',
    });
    const dto = {
      recipientUserId: 'userB',
      recipientDeviceId: 'dev2',
      senderIdentityKey: 'ik',
      senderEphemeralKey: 'ek',
    };

    const result = await controller.establishSession('userA', dto);

    expect(command.establishSession).toHaveBeenCalledWith(
      'userA',
      'device-from-context',
      dto,
    );
    expect(result).toEqual({
      sessionId: 'sess1',
      rootKeyCiphertext: 'rk',
      chainKeyCiphertext: 'ck',
      senderEphemeralPublic: 'ek',
    });
  });

  it('should accept session', async () => {
    command.acceptSession.mockResolvedValue({
      sessionId: 'sess2',
      rootKeyCiphertext: 'rk2',
      chainKeyCiphertext: 'ck2',
      senderEphemeralPublic: 'ek1',
    });
    const dto = {
      sessionId: 'sess1',
      senderEphemeralPublic: 'ek',
      senderIdentityKey: 'ik1',
      recipientIdentityKey: 'ik2',
    };

    const result = await controller.acceptSession('userB', dto);

    expect(command.acceptSession).toHaveBeenCalledWith(
      'device-from-context',
      dto,
    );
    expect(result).toEqual({
      sessionId: 'sess2',
      rootKeyCiphertext: 'rk2',
      chainKeyCiphertext: 'ck2',
      senderEphemeralPublic: 'ek1',
    });
  });

  it('should get session by id', async () => {
    query.getSessionById.mockResolvedValue({
      sessionId: 'sess1',
      rootKeyCiphertext: 'rk',
      chainKeyCiphertext: 'ck',
      senderEphemeralPublic: 'ek',
    });

    const result = await controller.getSession('sess1');

    expect(query.getSessionById).toHaveBeenCalledWith('sess1');
    expect(result).toEqual({
      sessionId: 'sess1',
      rootKeyCiphertext: 'rk',
      chainKeyCiphertext: 'ck',
      senderEphemeralPublic: 'ek',
    });
  });

  it('should list device sessions', async () => {
    query.listSessionsForDevice.mockResolvedValue([
      {
        sessionId: 'sess1',
        rootKeyCiphertext: 'rk',
        chainKeyCiphertext: 'ck',
        senderEphemeralPublic: '',
      },
    ]);

    const result = await controller.listDeviceSessions('dev1');

    expect(query.listSessionsForDevice).toHaveBeenCalledWith('dev1');
    expect(result).toEqual([
      {
        sessionId: 'sess1',
        rootKeyCiphertext: 'rk',
        chainKeyCiphertext: 'ck',
        senderEphemeralPublic: '',
      },
    ]);
  });
});
