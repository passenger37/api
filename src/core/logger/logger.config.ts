import { Params } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const logLevel =
  process.env.LOG_LEVEL ||
  (isProduction ? 'info' : 'debug');

/**
 * Redaction paths covering the "never log" list:
 * password, JWT, refresh token, access token, session/CSRF tokens,
 * private key material, secrets, and E2EE plaintext message content.
 * Each path is listed with and without a leading key to cover both the
 * object-key form (`req.body.password`) and peer-body form
 * (`req.body.*.password` style matches via the `password` bare path).
 */
const redactPaths = [
  // HTTP request headers
  'req.headers.authorization',
  'req.headers.cookie',
  '*.headers.authorization',
  '*.headers.cookie',

  // request / response bodies
  'req.body.password',
  '*.password',
  'req.body.oldPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.jwt',
  '*.secret',
  '*.apiKey',
  '*.clientSecret',
  '*.privateKey',
  '*.sessionToken',

  // outbound body redaction
  'res.body.token',
  'res.body.accessToken',
  'res.body.refreshToken',

  // E2EE plaintext material — backend must never log message content
  '*.plaintext',
  '*.content',
  '*.messageContent',
  '*.ciphertext',
];

export const loggerConfig: Params = {
  pinoHttp: {
    level: logLevel,

    // Top-level service identity for every log line.
    base: {
      service: 'nexus-api',
    },

    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            levelFirst: true,
          },
        },

    autoLogging: true,

    // Reuse the request trace id (set by TraceMiddleware or x-trace-id header)
    // as the pino request id, so request logs share the same traceId.
    genReqId: (req) => {
      const reqWithTrace = req as Request & { traceId?: string };
      if (reqWithTrace.traceId) {
        return reqWithTrace.traceId;
      }
      const id = randomUUID();
      reqWithTrace.traceId = id;
      return id;
    },

    // Attach request metadata (including authenticated userId) to every
    // request-log line, while keeping sensitive bearer material out.
    customProps: (req) => {
      const reqWithTrace = req as Request & { traceId?: string; user?: { id?: string } };
      return {
        userId: reqWithTrace.user?.id,
        traceId: reqWithTrace.traceId ?? randomUUID(),
      };
    },

    serializers: {
      // Emit only a safe subset of the request for structured logging.
      req(req) {
        const safeReq = {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        };
        return safeReq;
      },
    },

    redact: {
      paths: redactPaths,
      censor: '[Redacted]',
    },
  },
};
