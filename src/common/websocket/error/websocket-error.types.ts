import { WebSocketErrorCode } from './websocket-error-code.enum';

export interface WebSocketErrorPayload {
  code: WebSocketErrorCode;
  message: string;
}

export interface WebSocketErrorResponse {
  success: false;
  event: string;
  error: WebSocketErrorPayload;
}
