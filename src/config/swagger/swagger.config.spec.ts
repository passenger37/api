import {
  buildSwaggerConfig,
  NEXUS_DOCUMENTATION_TAGS,
} from './swagger.config';

describe('swagger.config (OpenAPI hardening)', () => {
  it('syncs the OpenAPI info.version with the current API version', () => {
    const config = buildSwaggerConfig(2);
    expect(config.info.version).toBe('2');
  });

  it('defaults to the live current API version', () => {
    expect(buildSwaggerConfig().info.version).toBe('2');
  });

  it('carries a descriptive title and tags for the documented domains', () => {
    const config = buildSwaggerConfig();
    expect(config.info.title).toBe('Nexus API');
    expect(config.tags?.map((t) => t.name)).toEqual([
      ...NEXUS_DOCUMENTATION_TAGS,
    ]);
  });

  it('registers the JWT bearer security scheme used by protected routes', () => {
    const securitySchemes =
      config().components?.securitySchemes ?? {};
    expect(securitySchemes['JWT']).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('declares at least a root server base for the versioned surface', () => {
    const servers = config().servers ?? [];
    expect(servers.some((s) => s.url === '/')).toBe(true);
  });

  function config(): ReturnType<typeof buildSwaggerConfig> {
    return buildSwaggerConfig();
  }
});
