import {
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';

/**
 * Lecture 40.85 - OpenAPI/Swagger Hardening (contract alignment).
 *
 * The documented OpenAPI schemas describe exactly the fields the API accepts.
 * To keep the wire contract in lock-step with the docs, the global validation
 * pipe is strict: it strips undocumented properties (whitelist), rejects any
 * unknown/forbidden property, and rejects unknown value types — so a request
 * that is not representable by a documented DTO fails fast instead of being
 * silently accepted. Options are exported so the harness/tests exercise the
 * exact production configuration.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  stopAtFirstError: false,
  forbidUnknownValues: true,
};

export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
}
