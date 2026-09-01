/**
 * Lecture 40.84 - API Versioning / Evolution (WebSocket).
 *
 * Backward-compatible event-evolution for the realtime surface.
 *
 * The pre-40.84 gateways emit flat payloads on plain event names, e.g.
 * `server.to(room).emit('dm-message-created', payload)`. These v1 clients
 * MUST keep working unchanged. When a later version needs to evolve the wire
 * format (new fields, renamed event), this helper lets a server emit a
 * versioned envelope while leaving v1 exactly as-is:
 *
 *   - v1  -> `emit('dm-message-created', payload)`            (identical)
 *   - v2+ -> `emit('dm-message-created.v2', { v, data })`      (evolved)
 *
 * `parseEnvelope` is tolerant of both forms so v1 raw payloads and v2
 * enveloped ones are read identically.
 */

/** The current wire format this backend emits. */
export const WS_ENVELOPE_VERSION = 2;

export interface WsEnvelope<T> {
  v: number;
  data: T;
}

export interface WsFrame<T> {
  event: string;
  payload: T | WsEnvelope<T>;
}

/**
 * Build the event-name + payload for a given wire version. Version 1 is the
 * unchanged legacy format; any newer version is wrapped in an envelope and the
 * event name is suffixed so v1 listeners do not see evolved events.
 */
export function wsEnvelope<T>(
  version: number,
  event: string,
  payload: T,
): WsFrame<T> {
  if (version <= 1) {
    return { event, payload };
  }
  return {
    event: `${event}.v${version}`,
    payload: { v: version, data: payload },
  };
}

/**
 * Read an emitted/received frame and return the underlying business payload
 * plus the wire version it was carried on. Tolerant: raw v1 payloads (no
 * envelope) and enveloped v2+ payloads both resolve to the same `data`.
 */
export function parseEnvelope<T, V>(
  event: string,
  frame: T | WsEnvelope<V>,
): { version: number; event: string; data: T | V } {
  if (
    frame !== null &&
    typeof frame === 'object' &&
    'v' in (frame as WsEnvelope<V>) &&
    'data' in (frame as WsEnvelope<V>)
  ) {
    const env = frame as unknown as WsEnvelope<V>;
    const baseEvent = event.replace(/\.v\d+$/, '');
    return { version: env.v, event: baseEvent, data: env.data };
  }
  return { version: 1, event, data: frame as T };
}

/**
 * Suggest the wire version a client should negotiate to, given the version it
 * currently uses and the current server wire version.
 */
export function suggestWireVersion(currentVersion: number): number {
  return currentVersion >= WS_ENVELOPE_VERSION
    ? currentVersion
    : WS_ENVELOPE_VERSION;
}
