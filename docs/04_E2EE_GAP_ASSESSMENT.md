# E2EE Gap Assessment — Production Hardening

## Status: Assessment Complete

## Executive Summary

The Nexus E2EE stack has 12 modules implementing a Signal Protocol-like architecture, but the core Double Ratchet (`e2ee-ratchet`) uses **custom Node.js `crypto` primitives** instead of the adopted `@signalapp/libsignal-client` library. This violates the locked "no custom cryptography" rule and fails the security audit control **E2EE-1**.

## Current Architecture vs. Required Architecture

| Component | Current Implementation | Required (per ADR 04) | Gap |
|-----------|----------------------|----------------------|-----|
| **Identity Keys** | Custom X25519 via `crypto.generateKeyPairSync('x25519')` | libsignal `IdentityKeyPair` | ✅ Format compatible |
| **Prekeys (Signed/One-Time)** | Custom DTOs + storage | libsignal `PreKeyRecord`, `SignedPreKeyRecord`, `KyberPreKeyRecord` | ⚠️ Need serialization alignment |
| **X3DH Session Establishment** | Custom `e2ee-sessions` + `e2ee-key-distribution` | libsignal `processPreKeyBundle` | ⚠️ Custom logic, not libsignal |
| **Double Ratchet** | **Custom implementation** (`e2ee-ratchet-command.service.ts` — 416 lines of HKDF, DH ratchet, AES-GCM, skipped keys) | libsignal `signalEncrypt` / `signalDecrypt` / `signalDecryptPreKey` | ❌ **Critical Gap** |
| **Session State Storage** | Custom Prisma model `E2eeRatchetState` with explicit fields | libsignal `SessionRecord` (opaque blob) | ❌ Schema mismatch |
| **Safety Numbers** | libsignal `Fingerprint` / `PublicKey` ✅ | libsignal `Fingerprint` | ✅ Only compliant component |
| **Group E2EE** | Custom `e2ee-groups` | libsignal `SenderKeyStore` / `groupEncrypt`/`groupDecrypt` | ❌ Not using libsignal |
| **Sealed Sender** | Not implemented | libsignal `sealedSenderEncrypt*` | ❌ Missing |

## Security Audit Status

| Control | Status | Evidence |
|---------|--------|----------|
| E2EE-1: libsignal in e2ee modules | **FAIL** | Only `e2ee-safety-number.service.ts` imports libsignal |
| E2EE-2: Safety numbers via libsignal | PASS | `e2ee-safety-number.service.ts` uses `Fingerprint`/`PublicKey` |

## Production Hardening Gaps (per Design Doc 04)

| Area | Requirement | Current Status |
|------|-------------|----------------|
| **Transport** | TLS everywhere, secure WS | ✅ Done |
| **Authentication** | Short-lived access tokens | ✅ JWT access tokens |
| | Refresh-token rotation | ❌ Not implemented |
| | Session invalidation | ⚠️ Basic logout only |
| | Device/session management | ✅ Device revocation exists |
| **Authorization** | Conversation membership | ✅ Channel/session validation |
| | Server/channel authorization | ✅ Permission system |
| | Device authorization | ⚠️ Partial (device ownership check only) |
| **Application** | Validation | ✅ DTO validation |
| | Rate limiting | ✅ WS + HTTP rate limits |
| | Abuse prevention | ⚠️ Basic limits only |
| | CORS restrictions | ✅ Configured |
| | Secure headers | ⚠️ Partial |
| | Dependency scanning | ✅ `security:audit` script |
| | Secret management | ✅ Env-driven configs |

## Key Non-Negotiable Rules (Design Doc §102-111)

| Rule | Compliance |
|------|------------|
| 1. Never invent custom encryption | ❌ Violated in `e2ee-ratchet` |
| 2. Never call server-decryptable E2EE | ✅ Ciphertext-only transport |
| 3. Never log plaintext | ✅ Redaction policy |
| 4. Never log private keys | ✅ Policy enforced |
| 5. Separate E2EE from cloud messaging | ✅ Separate modules |
| 6. Threat-model before production | ⚠️ Threat model doc exists (01-threat-model.md) |
| 7. Security review/audit | ❌ Not completed |

## Definition of Done (Design Doc §113-117) — Current Progress

| Criterion | Status |
|-----------|--------|
| Established protocol implementation | ❌ Custom ratchet |
| Secure client key storage | ⚠️ Client-side only; server stores opaque blobs |
| Verified device identity | ✅ Safety number verification |
| Ciphertext-only server path | ✅ Envelope transport |
| Metadata minimization | ⚠️ Partial (commitment in 03-key-material-policy.md) |
| Replay/downgrade protections | ⚠️ Skipped-key tracking in custom ratchet |
| Security tests | ❌ Missing protocol test vectors |
| Professional review | ❌ Not done |

## Recommended Remediation Sequence (M53)

### Phase 1: libsignal Integration (Fix E2EE-1) — **BLOCKING**
1. Implement `SessionStore`, `IdentityKeyStore`, `PreKeyStore`, `SignedPreKeyStore`, `KyberPreKeyStore` adapters over existing Prisma repositories
2. Replace `E2eeRatchetCommandService.encrypt/decrypt/ratchetStep` with libsignal `signalEncrypt`/`signalDecrypt`/`signalDecryptPreKey`
3. Store `SessionRecord.serialize()` as opaque blob in `E2eeRatchetState.sessionState` (schema migration)
4. Remove custom HKDF/DH/AES-GCM code from `e2ee-ratchet-command.service.ts`
5. Update DTOs to accept/return libsignal wire formats (`SignalMessage`, `PreKeySignalMessage`)

### Phase 2: Production Hardening — **HIGH**
1. **Refresh token rotation**: Add `refreshTokenRotation` to auth module (revoke old, issue new)
2. **Session invalidation**: Add `/auth/sessions/revoke-all` endpoint + device-aware session cleanup
3. **Device authorization**: Extend `E2eeDeviceRepository` with authorization context for envelope routing
4. **Key change warnings**: Add `onIdentityChange` callback in libsignal integration to notify clients
5. **Secure headers**: Add Helmet/CSRF middleware to HTTP server

### Phase 3: Metadata Minimization & Testing — **MEDIUM**
1. **Metadata minimization**: Audit presence/online correlation for E2EE flows (link to M52 realtime module)
2. **Protocol test vectors**: Add libsignal interoperability tests (encrypt/decrypt roundtrip with known vectors)
3. **Key rotation tests**: Automated tests for signed prekey rotation, one-time prekey refill, session rekey
4. **Downgrade/replay tests**: Verify skipped-key limits, out-of-order delivery, duplicate rejection

### Phase 4: Professional Review — **BLOCKER FOR PRODUCTION**
1. Engage external cryptographic audit of the libsignal integration
2. Penetration test E2EE message flow
3. Document threat model mitigations

## Effort Estimate

| Phase | Files Touched | Est. Days |
|-------|---------------|-----------|
| 1. libsignal Integration | ~15 (stores, ratchet service, DTOs, session schema) | 5-7 |
| 2. Production Hardening | ~10 (auth, sessions, devices, headers) | 3-4 |
| 3. Testing | ~8 (vectors, rotation, downgrade) | 2-3 |
| 4. Review Prep | ~3 (docs, threat model) | 1-2 |
| **Total** | | **11-16 days** |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| libsignal Node.js build issues on CI | Medium | High | Prebuilds validated in spike; pin Node version |
| Session schema migration breaks existing sessions | High | High | Versioned session state; backward-compatible decode |
| Wire format mismatch with client libsignal version | Medium | High | Pin client/server libsignal version; integration tests |
| Performance regression (WASM overhead) | Low | Medium | Benchmark encrypt/decrypt latency; profile |

---

*Generated as part of M53 E2EE Gap Assessment. Aligned with `docs/04_E2EE_PRODUCTION_HARDENING.md`, `docs/e2ee/04-library-selection.md`, and security audit control E2EE-1.*