import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * Lecture 40.97 — the /profiling probe namespace. Exists only so the profiler
 * can self-connect a socket.io client and measure real WebSocket round trips
 * (handshake, guard-less echo ack, dispatch latency) without fixtures or
 * authentication. No business data flows through it: it acknowledges an
 * internal `probe:ping` sequence number.
 */
@WebSocketGateway({
  namespace: 'profiling',
  cors: true,
})
export class ProfilingGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('probe:ping')
  onProbePing(@MessageBody() seq: number): { ok: true; seq: number } {
    return { ok: true, seq };
  }
}
