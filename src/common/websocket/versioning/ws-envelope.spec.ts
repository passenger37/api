import {
  parseEnvelope,
  suggestWireVersion,
  wsEnvelope,
} from './ws-envelope';

describe('ws-envelope (backward-compatible WS evolution)', () => {
  it('emits the identical flat payload/event for v1 (non-breaking)', () => {
    const frame = wsEnvelope(1, 'dm-message-created', { id: 'm1' });
    expect(frame.event).toBe('dm-message-created');
    expect(frame.payload).toEqual({ id: 'm1' });
  });

  it('wraps evolved versions in an envelope and suffices the event name', () => {
    const frame = wsEnvelope(2, 'dm-message-created', { id: 'm1' });
    expect(frame.event).toBe('dm-message-created.v2');
    expect(frame.payload).toEqual({ v: 2, data: { id: 'm1' } });
  });

  it('parses a raw v1 payload back to its data at version 1', () => {
    const out = parseEnvelope('dm-message-created', { id: 'm1' });
    expect(out.version).toBe(1);
    expect(out.event).toBe('dm-message-created');
    expect(out.data).toEqual({ id: 'm1' });
  });

  it('parses an enveloped v2 payload back to its data and strips the suffix', () => {
    const out = parseEnvelope('dm-message-created.v2', {
      v: 2,
      data: { id: 'm1' },
    });
    expect(out.version).toBe(2);
    expect(out.event).toBe('dm-message-created');
    expect(out.data).toEqual({ id: 'm1' });
  });

  it('suggests the current wire version to older clients', () => {
    expect(suggestWireVersion(1)).toBe(2);
    expect(suggestWireVersion(2)).toBe(2);
    expect(suggestWireVersion(3)).toBe(3);
  });
});
