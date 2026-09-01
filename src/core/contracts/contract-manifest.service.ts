import { Injectable } from '@nestjs/common';
import { CONTRACT_MANIFEST, ContractManifest } from './contract-manifest';

/**
 * Lecture 40.86 - API & WebSocket Contract Tests.
 *
 * Exposes the protected-contract manifest at runtime so introspection (and a
 * future real e2e harness / client generator) can read the exact invariants
 * that must hold across versions, the WS envelope, validation and error frames.
 */
@Injectable()
export class ContractManifestService {
  manifest(): ContractManifest {
    return CONTRACT_MANIFEST;
  }
}
