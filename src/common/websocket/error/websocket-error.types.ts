export interface WebSocketErrorPayload {
  code: string;
  message: string;
}

export interface WebSocketErrorResponse {
  success: false;
  event: string;
  error: WebSocketErrorPayload;
}
