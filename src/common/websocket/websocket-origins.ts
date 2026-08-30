const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

export const WEB_SOCKET_ALLOWED_ORIGINS: string[] = process.env.WS_ORIGINS
  ? process.env.WS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : DEFAULT_ORIGINS;

export const WS_MAX_BUFFER_BYTES = 64 * 1024;

export function isWebSocketOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }

  return WEB_SOCKET_ALLOWED_ORIGINS.includes(origin);
}
