# Nexus E2EE — Key Material Policy

> Status: foundation reference, part of Lecture 40.63 — Private E2EE Messaging Foundation.
> Master roadmap position: `PROJECT_DETAIL.md` row 40.63 (B2 40.55 / B1 E2EE-1/2/3).

## 1. The invariant

> The Nexus backend never receives, stores, or processes **private** key material for E2EE conversations. Private keys live only on user devices.

"Receives" includes all channels: API bodies, WebSocket envelopes, logs, support tooling, diagnostics. Any path that would place a private key on the server is a bug, by definition.

## 2. What the server stores (public/key-discovery domain)

| Item                             | Server-stored?       | Notes                                                     |
| -------------------------------- | -------------------- | --------------------------------------------------------- |
| Identity public key (per device) | Yes                  | immutable per device identity; changing it = new identity |
| Public signed prekey + signature | Yes                  | signature enables bundle-integrity verification           |
| One-time prekey public halves    | Yes                  | consumed atomically per session                           |
| Session-establishment metadata   | Yes (opaque)         | needed to route/establish; never plaintext-bearing        |
| Message envelopes (ciphertext)   | Yes                  | content-encrypted, stored for offline delivery            |
| Safety numbers / fingerprints    | Public artifacts     | derived from identity keys; verification is client-side   |
| **Private keys (any)**           | **Never**            | device-only                                               |
| **Plaintext messages**           | **Never** (Type C/D) | no server copy of plaintext exists                        |

## 3. What "opaque session data" means

Client libraries persist session state. Nexus treats any bytes it relays back to the same device as **opaque blobs**: stored and returned without parsing or interpreting them. The server may key them by (owner device, peer bundle hash) for lookup, but must never assume structure or contents.

## 4. Key lifecycle responsibilities

| Lifecycle stage         | Device (client library)                    | Nexus backend                                         |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Key generation          | Creates identity/signed/one-time key pairs | —                                                     |
| Publish                 | Uploads public halves                      | Validates shape/size, indexes by user+device          |
| Rotation                | Rotates signed/one-time keys, uploads new  | Version-tracks, serves newest bundle                  |
| Consumption             | —                                          | Atomic one-time-prekey consume; requests refill batch |
| Revocation              | Proves device loss; requests revoke        | Marks device revoked, refuses new sessions/bundles    |
| Deletion (device reset) | —                                          | Removes public bundle + queued envelopes              |

Concurrency rule (locked): one-time prekey consumption is a **single atomic operation** (DB-level uniqueness on the prekey id) so two concurrent session attempts can never both claim the same key.

## 5. Key byte conventions

- All key material handled as **binary blob / base64** fields; the server does not inspect contents.
- Public keys are validated only for sanity limits (non-empty, bounded size, expected universal-ish headers by the library such as each blob's 1-byte type prefix) — never semantically.
- Prekey bundles carry a **rotation count/version**, so clients can cache and detect staleness.
- Fingerprints (safety numbers): derived client-side from both identity keys; the server may serve the raw identity keys but the verification UX runs entirely device-side to avoid a server feeding a matching (fake) fingerprint.

## 6. Logging and observability policy

- **Never** log private keys, plaintext, or message content.
- Never log full ciphertext (an integrity leak vector for backups/logs that could aid traffic analysis).
- Allowed to log: routing metadata (sender/recipient device ids, timestamps, sizes), session-establishment counters, one-time-prekey inventory levels (for refill automation).

## 7. Encryption at rest / in transit for the _stored_ data

- Stored ciphertext envelopes and key blobs are additionally protected at rest by the database-layer encryption strategy and access control — defense in depth, not a substitute for client-side encryption.
- In transit: TLS end-to-end to the API/WS layer; E2EE (above) protects against server-side readers on top of TLS.

## 8. Metadata minimization commitment

The master roadmap locks a minimization direction:

- No content-derived metadata; Eu metadata includes only what routing needs.
- No plaintext recipient list inside a single multi-recipient blob: one envelope per recipient device (see `02-protocol-architecture.md` §7).
- No server-side plaintext search over E2EE content — search is deliberately dropped for Type C/D (explicit tradeoff in the master roadmap; possible future solution is client-side download + search).
- Forthcoming Metadata Minimization lecture (master 40.73) will harden `user:{id}` presence / online-status correlation signals for E2EE flows.

## 9. Backup and recovery tradeoffs

- The server **cannot** restore lost device keys (it never has them).
- Options offered to users (future lecture 40.72): device-independent key backup (encrypted export stored as opaque blob with user passphrase), or accept that a lost-and-unverified device can't read old history.
- Never propose a "recover plaintext via server" path; it contradicts §1.

## 10. Policy recap (must be restated in every E2EE-related change)

- Server holds zero private keys.
- Server holds zero plaintext for Type C/D.
- Ordinary message validation never applies to E2EE envelopes.
- One-time prekey consume is atomic.
- Key/publicity artifacts are versioned.
- Nothing E2EE-related is ever logged beyond routing metadata.
- Any feature requiring server-side decryption is rejected and redesigned around the constraint.
