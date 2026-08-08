import { NexusErrorCode } from './nexus-error-code';

export interface NexusWebSocketError {
  code: NexusErrorCode;
  message: string;
  details?: unknown;
}

export interface NexusWebSocketErrorResponse {
  success: false;

  event: string;

  error: NexusWebSocketError;
}
