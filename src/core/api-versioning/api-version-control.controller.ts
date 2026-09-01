import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ApiVersionControlService } from './api-version-control.service';
import { ApiVersionCatalog } from './api-version-registry';

/**
 * Lecture 40.84 - API Versioning / Evolution.
 *
 * A single route path (`/api`) served at two coexisting URI versions:
 *   - `GET /v1/api` - the legacy view (deprecated; the interceptor attaches
 *     `Deprecation` / `Sunset` / `Link`).
 *   - `GET /v2/api` - the current view (adds deprecation/migration metadata).
 *
 * This is the canonical demo of "two versions of one endpoint evolve in
 * parallel, old one deprecates, without breaking clients".
 */
@ApiTags('API Versioning')
@Controller('api')
export class ApiVersionControlController {
  constructor(private readonly versions: ApiVersionControlService) {}

  @Public()
  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Version catalog (legacy v1 view)' })
  v1(): { version: number; catalog: ApiVersionCatalog } {
    return { version: 1, catalog: this.versions.catalog() };
  }

  @Public()
  @Get()
  @Version('2')
  @ApiOperation({ summary: 'Version catalog (evolved v2 view)' })
  v2(): { version: number; current: number; deprecated: number[]; catalog: ApiVersionCatalog } {
    const catalog = this.versions.catalog();
    return {
      version: 2,
      current: catalog.current,
      deprecated: catalog.supported
        .filter((v) => v.deprecated)
        .map((v) => v.major),
      catalog,
    };
  }
}
