import { E2eeSessionQueryService } from './e2ee-session-query.service';
import { NotFoundException } from '@nestjs/common';

describe('E2eeSessionQueryService', () => {
  let service: E2eeSessionQueryService;
  let repo: {
    findById: jest.Mock;
    findBySenderDeviceId: jest.Mock;
    findByRecipientDeviceId: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySenderDeviceId: jest.fn(),
      findByRecipientDeviceId: jest.fn(),
    };
    service = new E2eeSessionQueryService(repo as any);
  });

  it('should return serialized session by id', async () => {
    repo.findById.mockResolvedValue({
      id: 'sess1',
      sessionState: 'state',
      associatedDataHash: 'hash',
    });

    const result = await service.getSessionById('sess1');

    expect(repo.findById).toHaveBeenCalledWith('sess1');
    expect(result).toEqual({
      sessionId: 'sess1',
      rootKeyCiphertext: 'state',
      chainKeyCiphertext: 'hash',
      senderEphemeralPublic: '',
    });
  });

  it('should throw NotFoundException when session not found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getSessionById('sess1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should list all sessions for a device', async () => {
    repo.findBySenderDeviceId.mockResolvedValue([
      { id: 'sess1', sessionState: 's1', associatedDataHash: 'h1' },
    ]);
    repo.findByRecipientDeviceId.mockResolvedValue([
      { id: 'sess2', sessionState: 's2', associatedDataHash: 'h2' },
    ]);

    const result = await service.listSessionsForDevice('dev1');

    expect(result).toEqual([
      {
        sessionId: 'sess1',
        rootKeyCiphertext: 's1',
        chainKeyCiphertext: 'h1',
        senderEphemeralPublic: '',
      },
      {
        sessionId: 'sess2',
        rootKeyCiphertext: 's2',
        chainKeyCiphertext: 'h2',
        senderEphemeralPublic: '',
      },
    ]);
  });
});
