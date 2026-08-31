import { serializeSession } from './e2ee-session.serializer';

describe('e2ee-session.serializer', () => {
  it('should serialize a session', () => {
    const result = serializeSession({
      id: 'sess1',
      sessionState: 'rootKey',
      associatedDataHash: 'chainKey',
      senderEphemeralPublic: 'ephemeral',
    });

    expect(result).toEqual({
      sessionId: 'sess1',
      rootKeyCiphertext: 'rootKey',
      chainKeyCiphertext: 'chainKey',
      senderEphemeralPublic: 'ephemeral',
    });
  });
});
