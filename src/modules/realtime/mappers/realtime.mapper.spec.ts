import {
  serializeSession,
  serializeUserPresence,
  serializeTypingState,
} from './realtime.mapper';
import {
  RealtimePresenceStatus,
  RealtimeTypingState,
  RealtimeUserPresence,
} from '../types/realtime.types';

describe('realtime.mapper', () => {
  it('serializeSession returns expected shape', () => {
    const input = {
      sessionId: 's1',
      userId: 'u1',
      lastSeen: 1000,
      device: 'mobile',
    };

    const result = serializeSession(input);

    expect(result).toEqual(input);
  });

  it('serializeSession omits undefined device', () => {
    const input = { sessionId: 's1', userId: 'u1', lastSeen: 1000 };
    const result = serializeSession(input);
    expect(result.device).toBeUndefined();
  });

  it('serializeUserPresence returns expected shape', () => {
    const input: RealtimeUserPresence = {
      userId: 'u1',
      status: RealtimePresenceStatus.ONLINE,
      lastSeen: 1000,
      sessionCount: 2,
      privacy: 'EVERYONE',
    };

    const result = serializeUserPresence(input);
    expect(result).toEqual(input);
  });

  it('serializeTypingState returns expected shape', () => {
    const input: RealtimeTypingState = { channelId: 'c1', userId: 'u1' };
    const result = serializeTypingState(input);
    expect(result).toEqual(input);
  });
});
