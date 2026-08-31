# Nexus E2EE — Threat Model

> Status: foundation reference, part of Lecture 40.63 — Private E2EE Messaging Foundation.
> Master roadmap position: `PROJECT_DETAIL.md` row 40.63 (B2 40.55 / B1 E2EE-1/2/3).

## 1. Scope

This model covers Nexus **private E2EE messaging** (message types **C** — private 1:1, and by extension **D** — E2EE secret groups). It does not cover normal cloud messaging (types A/B), which is intentionally server-readable and is governed by the ordinary messaging threat model.

The ruling property of everything below:

> The Nexus backend stores and relays **ciphertext** for E2EE conversations. It never possesses the private key material required to read plaintext, and it never sees plaintext content.

## 2. Adversaries

| Adversary                               | Capabilities                                                   | Can they read E2EE plaintext?                        | Notes                                                                                        |
| --------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Passive network observer                | read packets in transit                                        | No                                                   | defeated by TLS (in transit) plus E2EE (opaque to endpoint-adjacent MITM)                    |
| Active MITM (in-path)                   | intercept and tamper with network traffic                      | Only without device-key verification                 | defeated by signed prekeys + safety-number/fingerprint verification out-of-band              |
| Compromised Nexus server                | read/modify stored data, corrupt relay, see routing metadata   | No (content), but yes (metadata)                     | server sees session-establishment metadata, recipient device routing, timestamps, ciphertext |
| Rogue server operator                   | same as compromised server, plus key-distribution manipulation | Can substitute key bundles → MITM until verification | mitigated by signed prekeys (identity-bound) and user verification                           |
| Stolen active device                    | read local session state and keys                              | Yes (that device's past and future)                  | mitigated by remote device revocation + ratchet self-healing (post-compromise security)      |
| Stolen inactive/disposed device         | access to stored keys/session state                            | Past plaintext if keys persisted                     | mitigated by double-ratchet forward secrecy + device revocation deletion                     |
| Malicious recipient                     | is a legitimate participant                                    | Only their own copies                                | nothing to mitigate — they were authorized                                                   |
| Malicious participant in a secret group | same as legitimate member                                      | Only content they're sent                            | group escrow/rekey on removal limits exposure                                                |

## 3. What the server is trusted with

Even though the server cannot read content, the security of E2EE still **depends on the server in specific ways**:

- **Availability** — the server must relay envelopes and store ciphertext for offline delivery. A server outage stalls messaging; it does not leak plaintext.
- **Key distribution integrity** — the server is the source of recipient key bundles. A malicious server can serve **its own** keys and act as a MITM. This is why signed prekeys and out-of-band fingerprint verification exist.
- **Ordering metadata** — the server assigns sequence ordinals; correctness of ordering is server-provided, confidentiality of content is not.
- **Identity registry** — the server maps users and devices to public identity keys. If the registry is corrupted, devices can be impersonated until verification is performed.

## 4. Explicitly out of scope (defeated differently)

- **Plaintext content leakage via server compromise** — out of the model's reach by construction. The countermeasure is cryptographic (server never holds private keys) and enforced by device-only key custody.
- **Malware on the client device** — E2EE protects data in transit and at rest from server-side adversaries; it does not protect against a fully compromised device. Client-side security best practices apply separately.
- **Social-engineering verification** — a user who is tricked into verifying a fake identity accepts the impostor's key as authentic. Out-of-band verification UX must make this expensive.

## 5. Metadata reality (deliberately minimized, not eliminated)

The server must route ciphertext, so the following metadata exists (see `03-key-material-policy.md` for minimization rule):

- which users/devices are in a session
- per-message: sender device, recipient device(s), timestamp, envelope id
- ciphertext size (approximate content length)
- session-establishment events (when a new conversation/session begins)

Minimization commitments (locked): no content-derived metadata beyond what routing requires; no plaintext recipients list inside the envelope envelope; no server-side plaintext search over E2EE content (search for Type C/D is client-side only or impossible — traded away in the master roadmap decision).

## 6. Abuse and moderation (the unavoidable tradeoff)

Because the server never sees plaintext for E2EE conversations, **server-side plaintext moderation is impossible by design**. The master roadmap makes this explicit and requires it to stay visible in all future work. Abuse handling for E2EE relies on:

- user-initiated reports (sender/ciphered-context, with optional client-side encrypted report bundles)
- metadata-level abuse signals (rate limits, mass-message patterns, account signals)
- account-level enforcement (rate limits, blocks, bans) independent of content
- device/key-level enforcement (suspension of key distribution, device revocation)

**Never** secretly decrypt E2EE messages server-side. Any feature that would require it must be rejected and redesigned around the constraint.

## 7. Failure cascades and guarantees

| Property                 | Guarantee level         | Mechanism                                                                                                                     |
| ------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Forward secrecy          | Strong                  | Double ratchet produces message keys not derivable from past chain state; past plaintext is unrecoverable after chain advance |
| Post-compromise security | Strong                  | Honest message exchange rebuilds a fresh root key; attacker who held session keys loses access going forward                  |
| Authentication of peers  | Conditional             | Identity keys + signed prekeys; verification completes the chain (safety number comparison)                                   |
| Plausible deniability    | Inherent (Signal model) | No server-held signature fabric; the server only sees ciphertext, cannot attest authorship either                             |

## 8. Threat model decisions recorded at 40.63

1. **Signal-style security model** is the intended model for Nexus private E2EE (over Telegram-style). Rationale: real E2EE by default, forward secrecy, no server-side access. Traded away: server search/moderation/multi-device convenience.
2. **No custom cryptography** — a mature, audited Signal Protocol library will be used (see `04-library-selection.md`).
3. **Server hosts only ciphertext** for Type C/D content; all private keys remain device-local.
4. **E2EE backends are separate from ordinary messaging validation** — plaintext message validation rules never apply to E2EE envelopes (only envelope-size limits, routing checks, and rate limits).
5. **Fingerprint verification is a first-class mitigation** for the key-distribution threat and must surface as part of the 40.69 verification lecture.
