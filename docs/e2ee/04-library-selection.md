# Nexus E2EE — Signal Protocol Library Selection (ADR)

> Status: decision record (ADR) — **recommendation recorded, dependency NOT locked** — part of Lecture 40.63 — Private E2EE Messaging Foundation.
> Master roadmap position: `PROJECT_DETAIL.md` row 40.63. The roadmap marks the exact library/version `[UNKNOWN]` until an architecture decision. This ADR records the evaluation and the current recommendation; final `package.json` adoption happens when the transport is implemented (master 40.67 Double Ratchet / 40.68 E2EE Message Transport), subject to re-validation.

## 1. Context

- Locked rule: **no custom cryptography**. Use a mature, audited Signal-style implementation.
- The backend's role is key distribution, envelope routing, and opaque session/metadata storage — it does not run the ratchet itself. The library is required **on the client side**, but the backend needs to interoperate with the exact wire/format conventions (bundles, envelopes, session metadata) of the chosen implementation so 40.64–40.68 produce compatible artifacts.
- Runtime: NestJS backend (Node.js). Clients: web (browser) and eventual mobile (React Native). This favors implementations that cross JS/WASM and native boundaries.

## 2. Candidates

### 2.1 `@signalapp/libsignal-client` (official Signal, Rust core)

- **Pros:** the actual protocol the Signal app runs: audited core, full X3DH + Double Ratchet + sender keys + sealed sender; robustness; actively maintained by the Signal Foundation; native/WASM builds; bindings usable from Node via the Rust `libsignal` crate through `signalapp/libsignal` NPM packages (`libsignal-client` and `libsignal-node`).
- **Cons:** heavyweight; native/WASM module integration complexity; platform-specific builds (esp. mobile via Kotlin/Swift bindings); lower-level and less documented than wrapper libraries; Node addon (napi) build concerns on some environments.
- **Fit for Nexus:** excellent for an audited, forward-looking stack; highest integration cost.

### 2.2 `@privacyresearch/libsignal-protocol-typescript` (TypeScript port of the old libsignal)

- **Pros:** pure TypeScript; zero native deps; easy browser + Node; a faithful port of libsignal-protocol-js; familiar prekey + session APIs; simple to adopt in an all-TS backend.
- **Cons:** maintenance posture is secondary (community); based on the pre-ratchet-modernization library (older Double Ratchet implementation details); audited less recently; cursor-based session record API; less aligned with sealed-sender/modern features.
- **Fit for Nexus:** pragmatic for an all-TypeScript stack; weaker audit pedigree than the official Signal core.

### 2.3 `libsignal-protocol-js` (official legacy JS, deprecated-ish)

- Netherlands-adjacent: fine for reference, but superseded by `@signalapp/libsignal-*`. Not a serious candidate for new work.

### 2.4 Hypothetical in-house wrapper around a ratified spec

- Rejected by the locked no-custom-crypto rule. The only acceptable "wrapper" is thin glue around a candidate library's public API, never a reimplementation.

## 3. Evaluation criteria

1. Security pedigree — audited by whom, how recently, any CVE history.
2. Feature coverage — X3DH, Double Ratchet, one-time/signed prekey support, sender keys for groups, device/multi-device semantics.
3. Runtime portability — Node backend + browser + React Native mobile.
4. Integration cost — native/WASM dependency management, build tooling on all three targets.
5. Maintenance and license.
6. Wire-format interop — the backend stores/serves artifacts that the library will later parse; it must match the library's bundle/envelope format exactly.

## 4. Decision (recorded, not yet installed)

**Preferred: use the official Signal implementation family — `@signalapp/libsignal` (Rust core) with JS bindings — for the device/session protocol.**

Rationale:

- Strongest audit and feature coverage (modern ratchet, sealed-sender path, group sender-keys).
- Single source of truth for wire formats so Nexus key-distribution artifacts interoperate.
- The project's cross-platform targets are all supported (browser WASM, Node, Kotlin/Swift for a future native client).

Fallback if native/WASM integration friction proves unacceptable in 40.67/40.68:

- `@privacyresearch/libsignal-protocol-typescript` for an all-JS transport, accepting the weaker audit posture, with the Rust-core option revisited for production.

## 5. Consequences and sequencing

- **No dependency is added at 40.63.** This lecture ships this ADR only.
- 40.64 (device & key management) models key-bundle artifacts **format-agnostically** (opaque blobs + version metadata) so the library choice can change without schema churn.
- 40.67/40.68 re-validate the selection against the three criteria above with a concrete spike (attempt `@signalapp/libsignal` WASM/Node bindings in this repo, measure build+package weight and API ergonomics) before locking the dependency.
- If the spike fails portability criteria, record a superseding ADR before touching `package.json`.

## 6. Anti-goals

- No hand-rolled ECC/ratchet/X3DH.
- No dual-implementation drift: one library family owns the protocol; Nexserving adapters only.
- No "let's encrypt with AES-GCM manually" shortcuts for E2EE message content (entity-level crypto belongs to the library, not ad-hoc code).
