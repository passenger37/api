import {
  API_VERSION_REGISTRY,
  API_VERSION_CURRENT,
  API_VERSION_OLDEST,
} from '../api-versioning/api-version-registry';
import { WS_ENVELOPE_VERSION } from '../../common/websocket/versioning/ws-envelope';
import { VALIDATION_PIPE_OPTIONS } from '../../config/validation/validation.config';

/**
 * Lecture 40.86 - API & WebSocket Contract Tests.
 *
 * The protected-contract manifest: a single, runtime-introspectable list of the
 * cross-cutting invariants that future changes must not silently break. Where
 * possible it aggregates the *live* constants/options (versioning registry, WS
 * envelope version, validation strictness) so it cannot drift from their real
 * values; the associated spec cross-checks this manifest against the actual
 * implementations (deprecation headers, envelope round-trip, error frames).
 *
 * Think of it as the contract "disallow-list": if a refactor changes one of
 * these, the spec fails until the manifest is consciously updated.
 */

/** Versioned HTTP surface exposed by the version control feature. */
export const HTTP_VERSION_CONTRACT = {
  /** Base path served at every supported URI version. */
  versionedPublicPath: 'api',
  /** Route path that must resolve under both v1 and v2. */
  route: '/api',
  expectedRoutes: ['/v1/api', '/v2/api'],
  currentVersion: API_VERSION_CURRENT,
  oldestVersion: API_VERSION_OLDEST,
} as const;

/** Deprecation signalling contract (advertised via response headers). */
export const DEPRECATION_HEADER_CONTRACT = {
  headerNames: ['Deprecation', 'Sunset', 'Link'] as const,
  deprecatedVersion: API_VERSION_OLDEST,
  currentVersion: API_VERSION_CURRENT,
} as const;

/** WebSocket event-evolution contract (backward compatible since 40.84). */
export const WS_CONTRACT = {
  envelopeWireVersion: WS_ENVELOPE_VERSION,
  /** v1 must stay byte-identical to the legacy flat payload (non-breaking). */
  backwardCompatibleVersion: 1,
  /**
   * Evolved events are emitted on `<event>.<version>` and carry
   * `{ "v": <version>, "data": <payload> }`.
   */
  envelopeShape: ['v', 'data'] as const,
  eventVersionSuffix: '.v',
  canParseBoth: true,
} as const;

/** Request-validation contract (must match VALIDATION_PIPE_OPTIONS). */
export const VALIDATION_CONTRACT = {
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  implicitConversion: true,
  liveOptions: VALIDATION_PIPE_OPTIONS,
} as const;

/** Error-frame contract (HTTP-wide and WS). */
export const ERROR_FRAME_CONTRACT = {
  wsFrameShape: ['success', 'event', 'error'] as const,
  wsErrorShape: ['code', 'message'] as const,
} as const;

export interface ContractManifest {
  http: typeof HTTP_VERSION_CONTRACT;
  deprecation: typeof DEPRECATION_HEADER_CONTRACT;
  ws: typeof WS_CONTRACT;
  validation: typeof VALIDATION_CONTRACT;
  errorFrame: typeof ERROR_FRAME_CONTRACT;
  supportedVersions: number[];
  versionRegistryEntries: number;
}

export const CONTRACT_MANIFEST: ContractManifest = {
  http: HTTP_VERSION_CONTRACT,
  deprecation: DEPRECATION_HEADER_CONTRACT,
  ws: WS_CONTRACT,
  validation: VALIDATION_CONTRACT,
  errorFrame: ERROR_FRAME_CONTRACT,
  supportedVersions: API_VERSION_REGISTRY.map((v) => v.major),
  versionRegistryEntries: API_VERSION_REGISTRY.length,
};
