import { WebSocketErrorCode } from './websocket-error-code.enum';

export class WebSocketException extends Error {
  constructor(
    public readonly code: WebSocketErrorCode,
    message: string,
  ) {
    super(message);

    this.name = 'WebSocketException';
  }
}
