import { Params } from 'nestjs-pino';
import { randomUUID } from 'crypto';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

    transport:
      process.env.NODE_ENV === 'production'
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

    genReqId: () => randomUUID(),

    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
      ],
      censor: '[Redacted]',
    },
  },
};
