# Nexus E2EE — Signal Protocol Architecture

> Status: foundation reference, part of Lecture 40.63 — Private E2EE Messaging Foundation.
> Master roadmap position: `PROJECT_DETAIL.md` row 40.63 (B2 40.55 / B1 E2EE-1/2/3).
> This document explains the architecture Nexus follows. The cryptographic implementation will be provided by a mature, audited Signal Protocol library (see `04-library-selection.md`), **not** written from scratch.

## 1. High-level data flow (locked boundary)

```text
Sender device                     Nexus backend                     Recipient device
      │  encrypt locally                │  store/relay ciphertext          │  decrypt locally
      ▼                                 ▼                                  ▼
   Plaintext ──► Ciphertext ────────► envelopes + routing metadata ─────► Ciphertext ──► Plaintext
```

The backend is a **relay and store of ciphertext plus key-discovery infrastructure**. It never sees plaintext and never holds users' private keys.

## 2. The three public key types

### 2.1 Identity keys

- Long-lived, **one per device**; the public half is the device's identity.
- Generated on device registration; the server stores only the public bytes.
- Changing an identity key is intentionally expensive (it is a _new identity_) — it triggers re-verification.

### 2.2 Signed prekeys

- Medium-lived (rotated periodically, e.g. Signal rotates daily).
- The **private** signed prekey is signed by the identity _private_ key; the server stores the public signed prekey **plus the signature**.
- Purpose: binds the prekey to the device, so a server that substitutes a key cannot substitute one the device did not sign — MITM without verification fails.

### 2.3 One-time prekeys

- Short-lived, generated in batches by the device, published once.
- Consumed **one at a time** during session establishment (X3DH), so each new session starts from a fresh, single-use key.
- The server must consume them safely (atomic single-use semantics) and supply fresh ones when the supply drops.

## 3. Session establishment (X3DH handshake)

For Alice ▶ Bob on device D_b, with Alice possessing Bob's prekey bundle `(identity, signed prekey [+ signature], [one-time prekey])`:

1. Alice fetches Bob's bundle from the Nexus backend.
2. Alice verifies the signed-prekey signature against Bob's identity key.
3. X3DH derives a shared root key from combinations of the involved identity/prekey DH operations.
4. Alice uploads her initial message including her identity key + ephemeral handshake, starting the session.
5. Both sides now hold a shared root key; **Bob's session is created asynchronously on first message** (Nexus offline/fanout design: one envelope per active device, stored until each device creates the session).

Security consequences: a fresh one-time prekey per session prevents replay and downgrade to a replayable handshake; the identity-binding signature defeats server-served fake bundles _until_ verification.

## 4. The Double Ratchet

After X3DH, both sides run the Double Ratchet per message exchange:

- **Diffie–Hellman (as one half of each sender's public key)** — every exchange introduces fresh DH, so a stolen chain does not decrypt the next exchange (post-compromise security).
- **Symmetric chain (the second half)** — each message derives a unique message key from the chain, which is then discarded, so past message keys are unrecoverable once the chain advances (forward secrecy).

Properties delivered to Nexus E2EE:

| Property                 | Mechanism                                                       |
| ------------------------ | --------------------------------------------------------------- |
| Forward secrecy          | message keys are ephemeral and destroyed after use              |
| Post-compromise security | new DH each exchange rebuilds the root                          |
| Out-of-order resistance  | chain-tracked header keys + receiving/sending chain bookkeeping |
| Conversation continuity  | session state is stored per device-pair after handshake         |

## 5. Session state model

A **session** is per (sender device, recipient device). State includes identity keys of both peers, root/chain keys, message numbers, and pending prekeys. Session state survives across message exchanges and is restored on reconnect via stored session records.

Nexus backend role: store **opaque session metadata** that the client library asks the server to persist (not the keys themselves interpreted server-side). Exact storage shape is finalized at 40.64/40.66.

## 6. Envelopes (transport unit)

A delivered unit is an envelope, whose plaintext (a "message" in Signal terms) is produced device-side and then encrypted by the session:

```text
authenticated ciphertext of (session-establishment info or message)
        + sender device id
        + recipient device id(s)
        + message identifier
        + timestamp / delivery metadata
```

The backend validates only **routing and envelope-level** properties — sender/recipient device registration, size limits, rate limits — never the plaintext. E2EE message validation remains a separate path from ordinary server-message validation (locked in `03-key-material-policy.md` and the master roadmap §E2EE boundary).

## 7. Multi-device model

A user runs several devices; each has its own identity/session set:

```text
User
 ├── Device A  (identity key I_A)
 ├── Device B  (identity key I_B)
 └── Device C  (identity key I_C)
```

- Each device publishes its own bundle; sessions are per device-pair (a group with k N users × m devices fans out per device).
- **Fan-out rule:** one encrypted envelope per recipient device, stamped per device. Nexus relays each without cross-device plaintext reuse — the envelope for device B is distinct from the envelope for device A.
- Device verification and revocation are server-mediated (registry), never key-custody (see `03-key-material-policy.md`).

## 8. Groups (secret groups, type D — architecture only at 40.63)

Selected-group architecture notes (implemented at 40.70):

- Server-side "secret groups" must **not** be ordinary channels with a secret flag (locked in the roadmap).
- Signal-style group model: a group-session key shared among members, per-group cryptographic ratchet over a sender-keys chain.
- Removal ⇒ group rekey (escrow) so removed members lose access to subsequent content.
- Server stores ciphertext + routing/roster metadata only.

## 9. Library/architecture commitments

- Use an audited Signal Protocol implementation (not custom primitives).
- Keep the E2EE layer behind a narrow interface (envelope in/out, session store, key store) so the chosen library can be swapped at 40.67/40.68 without touching the routing/relay code.
- E2EE code lives in its own module to preserve the "plaintext validation stays separate" rule.
