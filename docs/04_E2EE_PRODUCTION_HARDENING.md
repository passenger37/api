# Nexus --- E2EE & Production Security Hardening

## Status

-   **Partially Completed** — libsignal hkdf integration (Commit: `ad9c88c feat(e2ee): gap assessment & production hardening`)
-   Full libsignal ratchet migration pending (tracked in `docs/04_E2EE_GAP_ASSESSMENT.md`)
-   Cryptographic principle: never invent cryptography.

## Messaging Security Model

``` text
Messaging
├── Server / Community Channels
│   └── Cloud-backed
├── Standard 1:1 DM
│   └── Cloud-backed
├── Private 1:1 DM
│   └── E2EE
└── Secret Groups
    └── E2EE
```

## Signal Direction

Private messaging should use an established Signal Protocol
implementation rather than custom cryptographic primitives.

Concepts to learn: - identity keys - prekeys - signed prekeys - session
establishment - Double Ratchet - forward secrecy - post-compromise
security - safety-number/key verification - device identity -
multi-device sessions - group E2EE

## High-Level Architecture

``` text
Client
 │
 ├── Identity Keys
 ├── Session State
 └── Encryption/Decryption
          │
          ▼
       Gateway
          │
          ▼
      Ciphertext
          │
          ▼
      Message Store
```

For E2EE messages, the server should transport/store ciphertext rather
than plaintext.

## Critical Security Boundary

Do not call a system E2EE if the server can decrypt the message.

Private keys should remain client-side. Never log plaintext E2EE
messages or private keys.

## Metadata

E2EE does not automatically hide: - timing - IP/network metadata -
account identity - message size - routing metadata - device information

Metadata minimization is a separate architecture problem.

## Production Hardening

Transport: - TLS everywhere - secure WebSocket configuration

Authentication: - short-lived access tokens - refresh-token rotation -
session invalidation - device/session management

Authorization: - conversation membership - server/channel
authorization - device authorization

Application: - validation - rate limiting - abuse prevention - CORS
restrictions - secure headers - dependency scanning - secret management

## Verification

Use device verification and key-change warnings for private
conversations.

## Lecture Flow

53.1 Threat Modeling 53.2 Security Boundaries 53.3 E2EE Architecture
53.4 Signal Protocol Concepts 53.5 Identity Keys 53.6 Prekeys 53.7
Session Establishment 53.8 Double Ratchet 53.9 Multi-Device 53.10 Group
E2EE 53.11 Key Verification 53.12 Secure Storage 53.13 Metadata
Minimization 53.14 Production Security 53.15 Security Testing 53.16
Audit Readiness

## Testing

Protocol test vectors, interoperability, key rotation, device
replacement, offline delivery, replay attempts, duplicate messages,
downgrade attempts, malformed ciphertext and compromised-session
recovery.

## Non-Negotiable Rules

1.  Never invent a custom encryption algorithm.
2.  Never call server-decryptable messaging E2EE.
3.  Never log plaintext private messages.
4.  Never log private keys.
5.  Separate E2EE from ordinary cloud messaging.
6.  Threat-model before production.
7.  Obtain security review/audit before declaring cryptographic
    production readiness.

## Definition of Done

Established protocol implementation, secure client key storage, verified
device identity, ciphertext-only server path, metadata minimization,
replay/downgrade protections, security tests and professional review.
