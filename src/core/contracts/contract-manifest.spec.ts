import {
  CONTRACT_MANIFEST,
  DEPRECATION_HEADER_CONTRACT,
  VALIDATION_CONTRACT,
  WS_CONTRACT,
  ERROR_FRAME_CONTRACT,
} from './contract-manifest';
import { API_VERSION_REGISTRY } from '../api-versioning/api-version-registry';
import { ApiVersionControlService } from '../api-versioning/api-version-control.service';
import {
  wsEnvelope,
  parseEnvelope,
} from '../../common/websocket/versioning/ws-envelope';
import { VALIDATION_PIPE_OPTIONS } from '../../config/validation/validation.config';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';
import { WebSocketException } from '../../common/websocket/error/websocket.exception';
import { WebSocketErrorCode } from '../../common/websocket/error/websocket-error-code.enum';

describe('ContractManifest (API & WebSocket contract disallow-list)', () => {
  describe('version catalogue aligns with the live registry', () => {
    it('mirrors the supported versions and current/oldest from the registry', () => {
      expect(CONTRACT_MANIFEST.supportedVersions).toEqual(
        API_VERSION_REGISTRY.map((v) => v.major),
      );
      expect(CONTRACT_MANIFEST.http.currentVersion).toBe(
        CONTRACT_MANIFEST.supportedVersions[
          CONTRACT_MANIFEST.supportedVersions.length - 1
        ],
      );
      expect(CONTRACT_MANIFEST.http.oldestVersion).toBe(
        CONTRACT_MANIFEST.supportedVersions[0],
      );
    });
  });

  describe('deprecation-header contract holds against the real service', () => {
    it('deprecated v1 emits Deprecation/Sunset/Link, current v2 emits none', () => {
      const versions = new ApiVersionControlService();
      const headers = versions.buildDeprecationHeaders(
        DEPRECATION_HEADER_CONTRACT.deprecatedVersion,
      );
      for (const name of DEPRECATION_HEADER_CONTRACT.headerNames) {
        expect(headers[name]).toBeTruthy();
      }
      expect(
        versions.buildDeprecationHeaders(
          DEPRECATION_HEADER_CONTRACT.currentVersion,
        ),
      ).toEqual({});
    });
  });

  describe('webSocket envelope contract holds against the real helper', () => {
    it('v1 stays byte-identical (backward-compatible) to the legacy payload', () => {
      const frame = wsEnvelope(
        WS_CONTRACT.backwardCompatibleVersion,
        'dm-message-created',
        { id: 'm1' },
      );
      expect(frame.event).toBe('dm-message-created');
      expect(frame.payload).toEqual({ id: 'm1' });
    });

    it('evolved frames carry the declared { v, data } shape and suffixed event', () => {
      const frame = wsEnvelope(
        WS_CONTRACT.envelopeWireVersion,
        'dm-message-created',
        { id: 'm1' },
      );
      for (const key of WS_CONTRACT.envelopeShape) {
        expect(frame.payload).toHaveProperty(key);
      }
      expect(frame.event).toBe(
        `dm-message-created${WS_CONTRACT.eventVersionSuffix}${WS_CONTRACT.envelopeWireVersion}`,
      );
    });

    it('parseEnvelope round-trips both raw v1 and enveloped evolved frames', () => {
      const raw = parseEnvelope('dm-message-created', { id: 'm1' });
      expect(raw.version).toBe(1);
      expect(raw.data).toEqual({ id: 'm1' });

      const enveloped = parseEnvelope('dm-message-created.v2', {
        v: 2,
        data: { id: 'm2' },
      });
      expect(enveloped.version).toBe(2);
      expect(enveloped.event).toBe('dm-message-created');
      expect(enveloped.data).toEqual({ id: 'm2' });
    });
  });

  describe('validation contract holds against the configured options', () => {
    it('the manifest flags match the live VALIDATION_PIPE_OPTIONS', () => {
      expect(VALIDATION_PIPE_OPTIONS.whitelist).toBe(
        VALIDATION_CONTRACT.whitelist,
      );
      expect(VALIDATION_PIPE_OPTIONS.forbidNonWhitelisted).toBe(
        VALIDATION_CONTRACT.forbidNonWhitelisted,
      );
      expect(VALIDATION_PIPE_OPTIONS.forbidUnknownValues).toBe(
        VALIDATION_CONTRACT.forbidUnknownValues,
      );
      expect(
        VALIDATION_PIPE_OPTIONS.transformOptions?.enableImplicitConversion,
      ).toBe(VALIDATION_CONTRACT.implicitConversion);
    });
  });

  describe('error-frame contract holds against the real normalizer', () => {
    it('produces the { success, event, error:{ code, message } } frame', () => {
      const normalizer = new WebSocketErrorNormalizer();
      const response = normalizer.normalize(
        new WebSocketException(WebSocketErrorCode.INVALID_PAYLOAD, 'bad'),
        'dm-send',
      );
      for (const key of ERROR_FRAME_CONTRACT.wsFrameShape) {
        expect(response).toHaveProperty(key);
      }
      for (const key of ERROR_FRAME_CONTRACT.wsErrorShape) {
        expect(response.error).toHaveProperty(key);
      }
      expect(response.success).toBe(false);
    });
  });
});
