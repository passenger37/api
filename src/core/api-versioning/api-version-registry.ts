/**
 * Lecture 40.84 - API Versioning / Evolution.
 *
 * The catalogue of supported API versions and the evolution notes they carry.
 * Backend-first: version control is data-driven so a future v3 is added by
 * editing this registry (and the controller), not by touching every route.
 *
 * Versioning strategy: URI path (`/v{n}/...`) via NestJS `VersioningType.URI`
 * with `defaultVersion: '1'` (see `src/config/versioning`), so the entire
 * pre-40.84 REST surface is implicitly v1 and does not change path/behaviour.
 */

/** A single supported API version and its evolution metadata. */
export interface ApiVersionEntry {
  major: number;
  /** Feature/lecture that introduced or last evolved this version. */
  introducedBy: string;
  /** Short human summary of what this version offers. */
  summary: string;
  /** True when the version is still served but scheduled for removal. */
  deprecated: boolean;
  /** ISO-8601 date after which a deprecated version may be removed. */
  sunset?: string;
  /** Version(s) clients should migrate to. */
  successor?: number[];
}

export interface ApiVersionCatalog {
  supported: ApiVersionEntry[];
  current: number;
  oldest: number;
}

/** Fixed schedule used when a version is deprecated (deterministic for tests). */
const SUNSET_DEFAULT_DAYS = 180;

function futureIso(days: number, from: string): string {
  const base = new Date(from);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const INTRODUCED_AT = '2026-09-01';

export const API_VERSION_REGISTRY: readonly ApiVersionEntry[] = [
  {
    major: 1,
    introducedBy: '40.00',
    summary:
      'Legacy REST/WS surface; preserved verbatim as the pre-40.84 contract.',
    deprecated: true,
    successor: [2],
    sunset: futureIso(SUNSET_DEFAULT_DAYS, INTRODUCED_AT),
  },
  {
    major: 2,
    introducedBy: '40.84',
    summary:
      'Evolved contract: versioned catalog + deprecation headers + compatible WS envelope.',
    deprecated: false,
    successor: [],
  },
];

export const API_VERSION_CURRENT = 2;
export const API_VERSION_OLDEST = 1;
