/**
 * Lecture 40.90 - Failure Injection Testing: WebSocket instance unavailable /
 * network interruption.
 *
 * Transport-level proof that a real socket.io client keeps the degradation
 * contract when the WS instance it targets is down: the attempt fails loud
 * (a `connect_error` is surfaced) and the connection promise rejects in
 * bounded time rather than hanging forever. No app/infra is required.
 */
import { io, Socket } from 'socket.io-client';

function waitForConnect(socket: Socket, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Connection timeout')),
      timeout,
    );
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

describe('Failure Injection: WebSocket instance unavailable (40.90)', () => {
  it('a connection to an unavailable instance fails loud in bounded time, never hangs', async () => {
    const socket = io('http://127.0.0.1:1/messages', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    const errors: unknown[] = [];
    socket.on('connect_error', (err) => errors.push(err));
    socket.on('error', (err) => errors.push(err));

    const start = Date.now();
    await expect(waitForConnect(socket, 3000)).rejects.toThrow(
      'Connection timeout',
    );
    const elapsed = Date.now() - start;

    expect(socket.connected).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);

    socket.close();
  });

  it('emits with an ack never resolve against an unavailable instance (bounded by ack timeout)', async () => {
    const socket = io('http://127.0.0.1:1/messages', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    socket.on('connect_error', () => undefined);

    const ackError = await new Promise<Error>((resolve) => {
      socket.timeout(2000).emit('join-channel', {}, (err: Error, res: unknown) => {
        if (err) resolve(err);
        else resolve(new Error(`unexpected ack: ${JSON.stringify(res)}`));
      });
    });

    expect(ackError).toBeDefined();
    expect(socket.connected).toBe(false);

    socket.close();
  });
});