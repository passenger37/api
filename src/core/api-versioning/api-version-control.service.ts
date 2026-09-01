import { Injectable } from '@nestjs/common';
import {
  API_VERSION_REGISTRY,
  ApiVersionCatalog,
  ApiVersionEntry,
} from './api-version-registry';

/**
 * Lecture 40.84 - API Versioning / Evolution.
 *
 * Backend-first version control: a single source of truth for supported
 * versions, the current/oldest versions, deprecation state, and the response
 * headers (`Deprecation` / `Sunset` / `Link`) that advertise an evolution path
 * to clients. Route-prefixing itself is handled by NestJS URI versioning
 * (`src/config/versioning/versioning.config.ts`); this service is the
 * decision + metadata layer used by `API_VERSION_CURRENT` endpoints and the
 * deprecation interceptor.
 */
@Injectable()
export class ApiVersionControlService {
  private readonly byMajor = new Map<number, ApiVersionEntry>(
    API_VERSION_REGISTRY.map((v) => [v.major, v]),
  );

  current(): number {
    return Math.max(...this.byMajor.keys());
  }

  oldest(): number {
    return Math.min(...this.byMajor.keys());
  }

  catalog(): ApiVersionCatalog {
    const supported = API_VERSION_REGISTRY.map((v) => ({
      ...v,
      sunset: v.sunset,
    }));
    return { supported, current: this.current(), oldest: this.oldest() };
  }

  /** Resolve an arbitrary client-requested major to the nearest supported one. */
  selectVersion(requestedMajor: number): number {
    const majors = [...this.byMajor.keys()].sort((a, b) => a - b);
    if (majors.length === 0) {
      return 1;
    }
    if (this.byMajor.has(requestedMajor)) {
      return requestedMajor;
    }
    if (requestedMajor < majors[0]) {
      return majors[0];
    }
    if (requestedMajor > majors[majors.length - 1]) {
      return majors[majors.length - 1];
    }
    return majors[majors.length - 1];
  }

  hasVersion(major: number): boolean {
    return this.byMajor.has(major);
  }

  isDeprecated(major: number): boolean {
    return this.byMajor.get(major)?.deprecated ?? false;
  }

  sunsetDate(major: number): string | undefined {
    return this.byMajor.get(major)?.sunset;
  }

  successors(major: number): number[] {
    return this.byMajor.get(major)?.successor ?? [];
  }

  /**
   * The deprecation headers to attach for a request served at `major`.
   * v1 (deprecated) gets `Deprecation` + `Sunset` + `Link`; current/migrated
   * versions get no deprecation headers (so fresh clients are unburdened).
   */
  buildDeprecationHeaders(major: number): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!this.isDeprecated(major)) {
      return headers;
    }
    headers['Deprecation'] = 'true';
    const sunset = this.sunsetDate(major);
    if (sunset) {
      headers['Sunset'] = sunset;
    }
    const successors = this.successors(major);
    if (successors.length > 0) {
      headers['Link'] = successors
        .map((s) => `</v${s}/api>; rel="successor-version"; title="v${s}"`)
        .join(', ');
    }
    return headers;
  }
}
