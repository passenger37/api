import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { API_VERSION_CURRENT } from '../../core/api-versioning/api-version-registry';

/**
 * Lecture 40.85 - OpenAPI/Swagger Hardening.
 *
 * The OpenAPI document is built from a pure, unit-testable function so the
 * generated spec is deterministic and its version stays in lock-step with the
 * API version (40.84). `configureSwagger` only wires it into the live app.
 */

export const NEXUS_DOCUMENTATION_TAGS = [
  'Auth',
  'Users',
  'Servers',
  'Messages',
  'Direct Messages',
  'Moderation',
  'Feed',
  'Search',
  'Media',
  'Jobs',
  'E2EE',
  'Roles & Permissions',
  'Sessions',
  'Health',
  'Metrics',
  'Load Model',
  'API Versioning',
  'Bookmarks',
] as const;

/**
 * Build the OpenAPI document configuration (everything except `paths`).
 * Versioned so `info.version` mirrors the current API major version.
 */
export function buildSwaggerConfig(
  version: number = API_VERSION_CURRENT,
): Omit<OpenAPIObject, 'paths'> {
  const builder = new DocumentBuilder()
    .setTitle('Nexus API')
    .setDescription('Nexus Social Network backend HTTP + WebSocket API.')
    .setVersion(String(version))
    .addServer('/')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT bearer token issued by /v1/auth (or /v2/auth). All protected routes accept this scheme.',
      },
      'JWT',
    );

  for (const tag of NEXUS_DOCUMENTATION_TAGS) {
    builder.addTag(tag);
  }

  return builder.build();
}

export const SWAGGER_CUSTOM_OPTIONS: SwaggerCustomOptions = {
  customSiteTitle: 'Nexus API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
};

export function configureSwagger(app: INestApplication): void {
  const envEnabled = process.env.SWAGGER_ENABLED
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production';

  if (!envEnabled) {
    return;
  }

  const config = buildSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/docs', app, document, SWAGGER_CUSTOM_OPTIONS);
}
