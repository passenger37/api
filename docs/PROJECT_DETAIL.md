# Nexus — PROJECT_DETAIL.md
## Consolidated Master Roadmap (v2 — Full Merge)

**Sources merged into this version:**
- `PROJECT_FUTURE_BACKEND_IMPLEMENTATION.md` (Doc B1)
- `PROJECT_FUTURE_BACKEND_IMPLEMENTATION_2.md` (Doc B2)
- `PROJECT_FUTURE_FRONTEND_IMPLEMENTATION.md` (Doc F)
- `ROADMAP.md` + prior `CURRENT_STATUS.md` (absorbed into v1 of this file — original not re-uploaded, so v1's content is treated as the authoritative record of what ROADMAP.md said)

**Merge rule (unchanged):** Implement every feature from all sources. Where a lecture number is claimed by more than one source with **different** content, both intents are implemented — as either a combined lecture or two sequential lectures — scheduled at the point that makes technical sense, not necessarily at the original number. Where sources describe the **same** feature under different numbers, they are treated as one lecture and deduplicated. Every renumbering is cross-referenced back to its original source/number below so nothing is silently dropped.

**Current backend position:** Lecture 40.81 — Multi-Instance WebSocket Scaling (completed) — Scale phase (40.80–40.100) advancing past the observability track (40.77–40.79)
**Completed:** 40.9–40.39 (see §3 and §4.1), 40.40 (Presence Foundation), 40.41 (Message/Event Idempotency), 40.42 (WebSocket Reconnection & Missed-Event Sync), 40.43 (Event Ordering & Consistency), 40.44 (Outbox Pattern / Reliable Event Delivery), 40.45 (Message Search — Part 1), 40.46 (Messaging Media/Attachment Backend — Part 1), 40.47 (Messaging Audit and Moderation), 40.48 (Advanced Messaging Performance), 40.49 (Server Module Completion), 40.50 (Social Graph Backend), 40.51 (Feed Backend), 40.52 (Authentication and Session Hardening), 40.53 (Advanced RBAC / Permission Optimization), 40.54 (Security Hardening), 40.55 (Redis Usage Strategy), 40.56 (PostgreSQL Index Strategy), 40.57 (Transaction Boundaries), 40.58 (Formalize Command/Query CQRS), 40.59 (Repository Boundary Hardening), 40.60 (Domain/Data Mapping), 40.61 (Distributed WebSocket Scaling — Redis adapter), 40.62 (Direct Message Domain), 40.63 (Private E2EE Messaging Foundation), 40.64 (E2EE Device and Key Management), 40.65 (Key Distribution Backend), 40.66 (Session Establishment — X3DH), 40.67 (Double Ratchet), 40.68 (E2EE Message Transport), 40.69 (E2EE Multi-Device Support + Key Rotation + Safety-Number Verification), 40.70 (Secret Groups / E2EE Group Messaging), 40.71 (E2EE Attachments), 40.72 (E2EE Offline Delivery + Device Revocation + Encrypted Backup/Recovery Tradeoffs), 40.73 (E2EE Metadata Minimization), 40.74 (Message Search — Part 2: external engine), 40.75 (Media Pipeline — Part 2: AV scan, thumbnails, transcoding via BullMQ), 40.76 (Background Jobs — BullMQ full set), 40.77 (Structured Logging), 40.78 (Distributed Tracing), 40.79 (Production Metrics), 40.80 (1M-User Load Model), 40.81 (Multi-Instance WebSocket Scaling)

---

## 1. Executive Direction

Nexus is a production-grade social/collaboration network, not a CRUD demo. Backend-first: the frontend is not started until backend contracts (auth, users, servers/channels, messaging REST+WS, pagination, notifications, media, error contract) are stable and frozen.

Flow per lecture: First Principles → Architecture → Decision → Folder/File Design → Implementation → Compile → Run → Swagger/API Test → Automated Tests → Security Review → Performance Review → Git Commit.

Monorepo: `apps/{api,web,mobile,admin,docs}`, `packages/{types,contracts,config,ui,utils}`, `infrastructure/{docker,nginx,monitoring,deployment}`.

**Locked stack:** NestJS · TypeScript · Prisma · PostgreSQL · Redis · Socket.IO · Passport · JWT · Argon2id · Swagger/OpenAPI · Pino. Infra: Docker/Compose, MinIO (local S3) → Cloudflare R2 (prod) + Cloudflare CDN, CI/CD. Future observability: OpenTelemetry, Prometheus, Grafana, Loki, Sentry. Frontend (after backend gate): Next.js, React, TypeScript, Socket.IO client. Later: React Native.

**Architecture principles (dedup B1 §3–8, B2 §2, §5–6):**
- Domain-first module structure: `modules/<domain>/{controllers,gateways,dto,services,repositories,queries,mappers,types,constants,exceptions}`. Reusable infra → `core`/`common`; business behavior → `modules`. Don't pre-create empty folders — add structure when a concept becomes real.
- Hybrid data access: Prisma for standard CRUD/relations; raw SQL only where Prisma can't express the query efficiently. Repository owns persistence — services never call Prisma directly.
- CQRS: commands (mutate + emit events) and queries (read-only, no side effects) are separate classes/services.
- Gateway rule: WebSocket gateways never own business logic — they authenticate, authorize, validate, and delegate to command/query services (B2 Rule 1). Broadcast only after successful persistence (B2 Rule 6). Room membership alone is not authorization (B2 Rule 7).
- Modular monolith now; extraction to services only if a real scaling/ownership problem appears (B2 §2.1, §21 Guiding Principle).

---

## 2. Messaging Architecture — Locked Decision (dedup B1 §18–21, B2 Phase 24)

Hybrid model, four message types:

| Type | Storage | Purpose |
|---|---|---|
| A — Server/Community Channels | Cloud-backed, plaintext at rest | Communities, servers, announcements, searchable history, moderation |
| B — Standard Direct Messages | Cloud-backed, plaintext at rest | Everyday DMs, multi-device sync, moderation/reporting |
| C — Private E2EE Direct Messages | Signal-style, server never sees plaintext | High-privacy 1:1 conversations |
| D — Secret Groups | Signal-style E2EE group | Server stores only ciphertext + minimal routing/delivery metadata |

**Signal-style decision:** Nexus follows Signal's security model over Telegram's (Signal-style strengths: real E2EE by default, forward secrecy; Telegram-style strengths: easier server-side search/moderation/multi-device — explicitly traded away for Types C/D).

**E2EE limitation (must stay visible in all future work):** server-side plaintext moderation is impossible by design for Types C/D. Abuse handling for private messages relies on user reports, client-side reporting, optional encrypted report bundles, metadata-level abuse signals, and account-level rate limiting. **Never** secretly decrypt E2EE messages (B1 §51 Moderation).

---

## 3. Completed Foundation — Lectures 40.9–40.30

No conflicts here; B2 doesn't cover this range and B1's numbers match what's already built.

```
40.9  ChannelMessageGateway
40.10 Integrate Gateway with CommandService
40.11 Authenticate WebSocket Connections with JWT
40.12 Authorize WebSocket Channel Access
40.13 Secure WebSocket Message Sending
40.14 send-message WebSocket Event
40.15 Broadcast Message Events & Room-Based Delivery
40.16 Update/Edit Message WebSocket Event
40.17 Delete Message WebSocket Event
40.18 Pin/Unpin Message WebSocket Events
40.19 Message Reactions WebSocket Events
40.20 ChannelMessageReactionQueryService
40.21 Reaction Query WebSocket Events
40.22 Broadcast Reaction Events to Channel Rooms
40.28 WebSocket Security Hardening — Gateway-Wide Validation Pipe (B2 40.28.9) + Negative/Security Tests (B2 40.28.10)
40.29 Messaging WebSocket Security Completion + WebSocket Error Contract & Normalization (B2 40.29)
40.30 Messaging Integration Test Boundary + WebSocket Connection Lifecycle (B2 40.30)
```

---

## 4. Unified Lecture Sequence — 40.31 onward

This is the real merge point: **B1's compressed 40.23–40.40 list**, **B2's granular 40.31–40.90 list**, and the **prior v1 sequence (40.31–40.60, sourced from ROADMAP.md)** disagree on numbering past ~40.36. Rather than force three different features onto one number, every unique feature is kept and placed in dependency order below. The "originally numbered" column shows every source so nothing is lost.

### 4.1 Messaging Query, Structure & Realtime State (immediate next block)

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.31 | Cursor-Based Message Pagination — Prisma cursor on `(createdAt, id)`, stable ordering, pagination metadata | B1 40.23/40.24, B2 40.31, v1 40.31 |
| 40.32 | Message Query Optimization — indexing, avoiding N+1 on reactions/attachments joins | B2 40.32 (**new vs v1**, inserted here as a direct follow-on to pagination) |
| 40.33 | Message Thread / Reply Queries — composed read model: parent anchor + bounded enriched replies | B1 40.32, B2 40.33, v1 40.32 |
| 40.34 | Message Edit History — snapshot trail written on every edit; bounded history read route | B1 "editing history" (§39), B2 40.34 |
| 40.35 | Message Delete Semantics — tombstone contract: deleted content suppressed on direct reads, parent tombstone in threads | B1 "deleted-message behavior" (§39), B2 40.35 |
| **40.36** | Mentions — `@user` / `@role` / `@everyone` parsing, authorization, anti-abuse cap, indexed mention records (completed) | B1 40.33, B2 40.36 |
| **40.37** | Read / Unread State — `lastReadMessageId` cursor per (channel, member), derived `unreadCount`, forward-only updates, no Redis (completed) | B1 40.25, B2 40.37, B1 concept §45 |
| **40.38** | Typing Indicators — ephemeral Redis presence + throttled `typing-start`/`typing-stop`, per-channel broadcast excluding sender, **no DB writes** (completed) | B1 40.26, B1 concept §44 — **not present in B2 at all; inserted here** |
| **40.39** | Message Delivery State (sent/delivered/read lifecycle with WS acks — `created` ack contract + `message-read` fan-out via the read cursor; broadcast never treated as persistence) (completed) | B1 40.28, B2 40.38 |
| **40.40** | Presence Foundation (Redis `user:{id}:presence`, online/idle/offline/dnd/invisible) (completed) | B1 40.27, B2 40.39, B1 concept §43, v1 40.35 |
| **40.41** | Message/Event Idempotency (`clientMessageId`, per-author unique dedupe, P2002 race recovery, dedupe-suppressed broadcast) (completed) | B1 40.30, B2 40.41, B1 concept §42 |
| **40.42** | WebSocket Reconnection & Missed-Event Synchronization (`sync-channel` replay with message-id cursor gap detection) (completed) | B1 40.29, B2 40.42 |
| **40.43** | Event Ordering & Consistency (per-channel `messageSeq` + atomic `ServerChannel.lastMessageSeq` counter, message `version` for stale-update detection, optimistic-concurrency edits) (completed) | B1 concept §41, B2 40.43 |
| **40.44** | Outbox Pattern / Reliable Event Delivery (transactional `OutboxEvent` next to business data, 500ms polling dispatcher, at-least-once publish + client dedupe, max-attempts FAILED) (completed) | B2 40.40 (**CONFLICT with v1 40.40 `Distributed WebSocket Scaling`** — both implemented; scaling moved to §4.4 below since it depends on presence/outbox existing first) |

**Search — split in two (genuine sequencing conflict):** v1/B1 want basic search early (right after threads); B2 defers all search to its Phase 35 (after E2EE and media). Both are implemented, split by scope:
- **40.45 Message Search — Part 1 (Basic):** Postgres full-text/search vector (generated `tsvector` + GIN) over community-channel messages, server-scoped with per-channel view filtering, author/date filters, keyset cursor (completed) *(v1 40.33, B1 40.34)*
- **Message Search — Part 2 (Advanced):** external search engine evaluation, ranking, ships later in §4.6. *(B2 40.64)*

**Attachments — split in two (same kind of conflict):** v1 wants full signed-URL/R2/CDN/AV-scan/thumbnail pipeline early (needed once threads/mentions exist); B2 defers heavy media processing to its Phase 36 background-jobs era. Split:
- **40.46 Messaging Media/Attachment Backend — Part 1 (Basic upload path):** signed URLs, Cloudflare R2, CDN, MIME validation, size limits (completed) *(v1 40.37, B1 concept §49)*
- **Media Pipeline — Part 2 (Advanced processing):** antivirus scan, thumbnail generation, transcoding, all via BullMQ. Moved to §4.6 with Background Jobs. *(B2 40.65, v1 40.37's AV/transcode detail)*

| # | Lecture | Originally numbered as |
|---|---|---|
| **40.47** | Messaging Audit and Moderation — report/block/mute/ban, spam detection, abuse rate limiting, audit logs; explicit note that E2EE (Type C/D) moderation is client-side/metadata-only, never server decryption (completed) | v1 40.38, B1 §51 (fuller detail merged in) |
| **40.48** | Advanced Messaging Performance (query/caching pass once full feature set exists) (completed) | v1 40.39 |

### 4.2 Server/Social/Feed/Auth Completion

| # | Lecture | Originally numbered as |
|---|---|---|
| **40.49** | Server Module Completion - server settings update (SERVER_UPDATE), owner-only delete (SERVER_DELETE), self-leave (completed) | v1 40.41 |
| **40.50** | Social Graph Backend - close friends circles (UserCircle), follower/following counts on public profile, suggested users, block request cleanup (completed) | v1 40.42, B1 Phase 4 |
| **40.51** | Feed Backend - message-activity feed (latest/following), auth-aware channel filtering, composite cursor pagination (completed) | v1 40.43, B1 Phase 6 |
| **40.52** | Authentication and Session Hardening - rate-limited login/register/refresh, public refresh/logout, ACTIVE/deleted enforcement, session list + revoke, durable lastSeenAt, auth audit trail (completed) | v1 40.44 |
| 40.53 | Advanced RBAC / Permission Optimization (completed) | v1 40.45 |
| 40.54 | Security Hardening — WebSocket Security Review + API Security Hardening (completed) | v1 40.46, B2 40.52/40.53 |

### 4.3 Redis / Database / Code-Architecture Formalization

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.55 | Redis Usage Strategy (production responsibilities: cache, sessions, rate limit, presence, typing, pub/sub, locks, job coordination) (completed) | B2 40.46, B1 concept §47 |
| 40.56 | PostgreSQL Index Strategy (completed) | B2 40.47 |
| 40.57 (completed) | Transaction Boundaries (completed) | B2 40.48 |
| 40.58 (completed) | Formalize Command/Query (CQRS) Architecture (completed) | B2 40.49 |
| 40.59 (completed) | Repository Boundary Hardening (completed) | B2 40.50 |
| 40.60 (completed) | Domain/Data Mapping (completed) | B2 40.51 |

### 4.4 Distributed / Scaling Foundation (moved later — depends on 4.1–4.3)

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.61 | Distributed WebSocket Scaling — Redis adapter foundation (completed) | v1 40.40 (**this is the other half of the 40.44/40.40 conflict noted above**) |

### 4.5 Private Messaging & E2EE (dedup B2 Phase 24–34 with B1's 16-lecture E2EE sequence)

B1 numbers E2EE as a separate "E2EE Lecture 1–16" track; B2 folds it into the main 40.x sequence at 40.54–40.63. Merged below on B2's numbering, with B1's extra granularity inserted as sub-items where B2 has no equivalent lecture.

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.62 (completed) | Direct Message Domain (Type B — standard, non-E2EE DMs) | B2 40.54 |
| 40.63 (completed) | Private E2EE Messaging Foundation — crypto fundamentals, threat model, Signal Protocol architecture; docs under `docs/e2ee/` + library ADR (no dependency locked) | B2 40.55, B1 E2EE-1/2/3 |
| 40.64 (completed) | E2EE Device and Key Management — multi-device identity keys; `src/modules/e2ee-devices/` (register/list, signed-prekey rotation, one-time-prekey refill, revoke) | B2 40.56, B1 E2EE-4 |
| 40.65 (completed) | Key Distribution Backend — prekey server; `src/modules/e2ee-key-distribution/` (fetch key bundles, claim one-time prekeys) | B2 40.57, B1 E2EE-5 |
| 40.66 (completed) | Session Establishment — X3DH handshake orchestration; `src/modules/e2ee-sessions/` (establish/accept sessions, list per device) | B2 40.58, B1 E2EE-6 |
| 40.67 (completed) | Double Ratchet — `src/modules/e2ee-ratchet/` (symmetric KDF chains, X25519 DH ratchet step, AES-256-GCM message encryption, skipped-message-key cache for out-of-order delivery, bootstrap from the 40.66 session state; scaffold library primitives — libsignal ADR spike lands at 40.68) | B2 40.59, B1 E2EE-7 |
| 40.68 (completed) | E2EE Message Transport — `src/modules/e2ee-transport/` envelope send/fetch, offline delivery queue, ciphertext-only persistence | B2 40.61, B1 E2EE-8 |
| 40.69 (completed) | E2EE Multi-Device Support + Key Rotation + Safety-Number Verification — `src/modules/e2ee-devices/` device verification, signed prekey rotation, OTK refill, scheduled tasks, Fingerprint API | B1 E2EE-9/10/11 (**not broken out in B2 — inserted here**) |
| 40.70 (completed) | Secret Groups / E2EE Group Messaging — `src/modules/e2ee-groups/` sender keys protocol, group membership, group sessions, fan-out envelopes | B2 40.60, B1 E2EE-12 |
| 40.71 (completed) | E2EE Attachments — `src/modules/e2ee-attachments/` encrypted metadata, client-side encryption, R2/MinIO storage, signed URLs, thumbnails | B2 40.62, B1 E2EE-13 |
| 40.72 (completed) | E2EE Offline Delivery + Device Revocation + Encrypted Backup/Recovery Tradeoffs — `src/modules/e2ee-delivery/`, `src/modules/e2ee-revocation/`, `src/modules/e2ee-backup/`, `src/modules/e2ee-key-transparency/` delivery queues, revocation flow, encrypted backups, key transparency | B1 E2EE-14/15/16 (**not broken out in B2 — inserted here**) |
| 40.73 | E2EE Metadata Minimization | B2 40.63 |

### 4.6 Search Pt.2, Media Pt.2, Background Jobs, Observability

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.74 | Message Search — Part 2 (Advanced: external engine, ranking) | B2 40.64 |
| 40.75 | Media Pipeline — Part 2 (AV scan, thumbnails, transcoding via BullMQ) | B2 40.65 |
| 40.76 | Background Jobs (BullMQ full set: email, push, media processing, thumbnails, link preview, feed recompute, search indexing, cleanup, analytics) | B2 40.66, B1 §48 |
| 40.77 | Structured Logging | B2 40.67 |
| 40.78 | Distributed Tracing | B2 40.68 |
| 40.79 | Production Metrics | B2 40.69 |

### 4.7 Scale, Performance, Testing, Production

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.80 | 1M-User Load Model | B2 40.70 |
| 40.81 | Multi-Instance WebSocket Architecture (full horizontal scaling) | B2 40.71 |
| 40.82 | PostgreSQL Scaling | B2 40.72 |
| 40.83 | Cache Architecture | B2 40.73 |
| 40.84 | API Versioning / Evolution | B2 40.74 |
| 40.85 | OpenAPI/Swagger Hardening | B2 40.75 |
| 40.86 | API & WebSocket Contract Tests | B2 40.76 |
| 40.87 | Database Integration Tests | B2 40.77 | COMPLETED |
| 40.88 | Redis Integration Tests | B2 40.78 | COMPLETED |
| 40.89 | Messaging E2E Tests | B2 40.79 |
| 40.90 | Failure Injection Testing | B2 40.80 |
| 40.91 | Production Deployment Architecture | B2 40.81 |
| 40.92 | Production Docker / Containerization | B2 40.82 |
| 40.93 | Backend CI Pipeline | B2 40.83 |
| 40.94 | Production Prisma Migration Strategy | B2 40.84 |
| 40.95 | PostgreSQL Backup & Disaster Recovery | B2 40.85 |
| 40.96 | Backend Security Audit | B2 40.86 |
| 40.97 | Performance Profiling | B2 40.87 |
| 40.98 | 1M-User Capacity Planning | B2 40.88 |
| 40.99 | Backend Production Readiness Review | B2 40.89 |
| 40.100 | Backend Feature Freeze | B2 40.90 |

### 4.8 Additive from Doc B1 (not present in B2 at all) — placed post-freeze, pre-frontend

| # | Lecture | Source |
|---|---|---|
| 40.101 | Admin Backend (user/server moderation, reports, abuse detection, system health, audit logs, feature flags, config, support tools — permissions separated from normal server RBAC) | B1 §73 |
| 40.102 | Feature Flags (flag → percentage rollout → user cohort → server cohort) | B1 §74 |
| 40.103 | AI Architecture (feed recs, moderation assist, spam detection, summarization, search ranking, smart replies) — added only after core deterministic systems are stable; AI never becomes the source of truth for authorization | B1 §75 |
| 40.104 | Security + AI — no private E2EE plaintext to a centralized AI backend without explicit opt-in; prefer on-device processing for E2EE content | B1 §76 |

**Backend Completion Gate (from B2 §20, unchanged — checklist form):** Auth · Authorization · Users · Social graph · Organizations · Servers · Channels · Cloud messaging · Direct messaging · Private E2EE · Secret groups · Notifications · Redis architecture · WebSocket scaling · DB optimization · Security hardening · Integration/E2E/Load tests · Observability · CI/CD · Backup/recovery · API contracts frozen · WebSocket contracts frozen · Production deployment validated → **BACKEND COMPLETE → CONTRACT FREEZE → FRONTEND START**.

---

## 5. Frontend Phases — PROJECT_FUTURE_FRONTEND_IMPLEMENTATION.md

Confirmed fully represented already; no numbering conflicts with the backend 40.x track (frontend uses its own `F#`/`F#.#` lecture numbers). Cross-checked against the full document — all 27 phases and all 25 supporting-concept sections match; nothing new to merge in beyond what v1 already listed.

**Start gate (unchanged):** stable Authentication, Authorization, Users, Social graph, Servers, Server members, Channels, Channel permissions, Feed APIs, Messaging REST/command APIs, Messaging WebSocket events, Reaction APIs/events, Notifications contract, DTO contracts, Error contract, Pagination contract, Upload/media contract.

**Stack:** Next.js, React, TypeScript, Tailwind CSS, CSS variables, TanStack Query, Zustand, React Hook Form, Zod, Socket.IO client, Web Crypto API, IndexedDB, Service Worker/PWA.

**Phases:** F0 Foundation → F1 Design System → F2 App Shell → F3 Auth → F4 Profile → F5 Social Graph → F6 Feed → F7 Servers → F8 Channel Messaging → F9 Reactions → F10 Notifications → F11 Media → F12 Search → F13 Privacy/Security UI → F14 Private E2EE Messaging → F15 E2EE Device Architecture → F16 Secret Groups → F17 Advanced Messaging → F18 Reels/Short Video → F19 Organizations → F20 Opportunities → F21 AI UX → F22 Admin Frontend → F23 Performance → F24 Offline/Resilience → F25 Testing → F26 Accessibility → F27 Production Hardening.

**Supporting concepts (§14–38, all present, unchanged):** E2EE High-Level Architecture · Signal-Style Frontend Concepts · Frontend Data Flow Strategy · Message Data Flow · Optimistic Update Strategy · WebSocket State Machine · Error Handling · API Contract Strategy · Security Rules · E2EE Security Rule · Repo Strategy · Dev Workflow (12 steps) · Screen Map · Responsive Strategy · Architecture Decisions (12) · Production Toolchain · Integration Milestones (15) · What NOT to Build Too Early · Learning Strategy · New Concepts · Recommended Order · Start Point (F0.1) · Final Architecture Vision · Completion Definition · Relationship With Backend Roadmap.

Frontend remains **blocked** until the Backend Completion Gate (§4, end) is satisfied.

---

## 6. Master Phase Roadmap (top level, dedup B1 §105 + B2's phase list)

```
PHASE 1  Foundation
PHASE 2  Auth + Authorization
PHASE 3  Users / Identity
PHASE 4  Social Graph
PHASE 5  Servers / Organizations
PHASE 6  Feed
PHASE 7  Community Messaging
PHASE 8  Realtime + Messaging Hardening        ← §4.1 (current)
PHASE 9  Server/Social/Feed/Auth Completion    ← §4.2
PHASE 10 Redis / DB / Code Architecture        ← §4.3
PHASE 11 Distributed Scaling Foundation        ← §4.4
PHASE 12 Privacy + Signal E2EE                 ← §4.5
PHASE 13 Search Pt.2 / Media Pt.2 / Jobs / Observability ← §4.6
PHASE 14 Scale + Performance + Testing + Production      ← §4.7
PHASE 15 Admin / Feature Flags / AI            ← §4.8
========================
FRONTEND START GATE
========================
PHASE 16 Next.js Web (F0–F27)
PHASE 17 React Native (Mobile)
```

---

## 7. Consolidated Execution Order

1. **40.31** Cursor-Based Message Pagination — completed.
2. **40.32** Message Query Optimization — completed (composite indexes `(channelId, createdAt, id)` + `(parentMessageId, createdAt, id)`, batched `countReactionsByMessages` groupBy, enriched history read model).
3. **40.33** Message Thread / Reply Queries — completed (`getThread` aggregate: parent anchor + bounded replies enriched with reaction counts, wired into the replies route).
4. **40.34** Message Edit History — completed (`ChannelMessageEdit` model + migration, transactional snapshot write in `editMessage`, `getEditHistory` + history route).
5. **40.35** Message Delete Semantics — completed (`getMessage` 404 on deleted, thread-parent tombstones with suppressed content).
6. **40.36** Mentions — completed (`parseMentions` util; `ChannelMentionResolver` with `@everyone` permission gate, role/member resolution, 50-mention cap; `ChannelMention` model + migration; tx-aware repository; persistence on create + edit; `getMessageMentions` + `mentionCount` enrichment).
7. **40.37** Read / Unread State — completed (`ChannelReadState` cursor per channel/member + forward-only `markChannelRead`; derived `unreadCount`; `GET`/`POST .../read-state` routes; no Redis).
8. **40.38** Typing Indicators — completed (ephemeral Redis presence with 10 s TTL; throttled `typing-start`/`typing-stop`; per-channel broadcast excluding the sender; no DB writes, no schema change).
9. **40.39** Message Delivery State — completed (explicit `created` ack on send; `message-read` WS fan-out routed through the 40.37 read cursor; broadcast never conflated with read; no per-message read rows).
10. **40.40** Presence Foundation — completed (Redis `user:{id}:presence`, online/idle/offline/dnd/invisible, socket-lifecycle driven).
11. **40.41–40.88** — completed sequentially through §4.1–§4.8 as tabulated above, ending with E2EE Metadata Minimization (`src/modules/e2ee-metadata/`), Message Search Pt.2 (`src/modules/search/` MeiliSearch), Media Pipeline Pt.2 (`src/modules/media/`), Background Jobs (`src/modules/jobs/` BullMQ full set), Structured Logging (`src/core/logger/` pino redaction + `StructuredLogger` helper), Distributed Tracing (`src/core/tracing/` ALS `TraceService` + `TraceMiddleware`), Production Metrics (`src/core/metrics/` `MetricsService` + `GET /metrics`), the 1M-User Load Model (`src/core/load-model/` + `scripts/load/load-baseline.mjs`), Multi-Instance WebSocket Scaling (`src/core/redis/redis-node-registry.ts` + adapter hardening), Load-model-driven DB/query optimisation (`src/core/db/query-optimizer/` + `GET /load-model/optimiser`), the Cache Architecture (`src/core/cache/` + `GET /load-model/cache`), API Versioning / Evolution (`src/core/api-versioning/` + `GET /v1/api` & `GET /v2/api` + `ws-envelope`), OpenAPI/Swagger Hardening (`src/config/swagger/` `buildSwaggerConfig` + `src/config/validation/` `VALIDATION_PIPE_OPTIONS`), API & WebSocket Contract Tests (`src/core/contracts/` `ContractManifest`), and Database Integration Tests (`src/testing/db/` — opt-in real-Postgres harness + `npm run test:db`), and Redis Integration Tests (`src/testing/redis/` — opt-in real-Redis harness + `npm run test:redis`), advancing the Scale phase (40.80–40.100).
12. Continue sequentially through **§4.9**; next is **40.89 — (Messaging E2E Tests)**.
8. Satisfy the Backend Completion Gate (§4, end).
9. Open frontend start gate → Phase F0 onward.

For each lecture: briefing before coding (why, how, drawbacks, fit, alternatives) → implement common feature + any conflicting/additional intent noted in the "Originally numbered as" column → update ROADMAP.md and CURRENT_STATUS.md.

---

## 8. Implementation Rules

- Backend-first — LOCKED.
- Update ROADMAP.md and CURRENT_STATUS.md on every lecture.
- Validation: `whitelist`/`forbidNonWhitelisted`/`transform` active globally.
- `TooManyRequestsException` → `HttpException(HttpStatus.TOO_MANY_REQUESTS)`.
- `WebSocketValidationPipe` applied at gateway class level.
- Implement every feature from all four source docs — none dropped, see §4's cross-reference columns.
- Conflicting lecture numbers → both intents implemented; scheduled at the technically correct point, not forced onto the original number (see §4.1's Outbox/Scaling and Search/Attachment splits for the worked examples).
- Gateway never owns business logic; broadcast only after persistence succeeds; room membership ≠ authorization (B2 Rules 1, 6, 7).
- E2EE (Types C/D): server never decrypts; moderation for these types is client-side/metadata-only.

---

## 9. Next Immediate Action

**Lecture 40.89 — (Messaging E2E Tests).** 40.88 is complete.

**Lecture 40.88 — Redis Integration Tests — COMPLETED**
- **Why:** 40.87 covered the database. The remaining Redis-backed subsystems (rate limiting, presence, cache-aside, BullMQ queues, and the distributed-lock / pub-sub / node-registry coordination primitives) are exercised by unit specs that mock `RedisService`. This lecture adds true integration coverage against live Redis so counters/expiry, TTL semantics, queue round-trips, and cross-client coordination are verified on the real store rather than mocks.
- **How:** added `src/testing/redis/` — an opt-in real-Redis harness (`redis-test.harness.ts`) that points the real `RedisService` at a dedicated logical DB index (default `15`, via `NEXUS_REDIS_TEST_DB`), flushes it, and exposes `flush()`/`cleanup()`. Five `*.red-is.spec.ts` suites run against the live store: **rate limit** (`WebSocketRateLimitService`/`AuthRateLimitService` INCR+EXPIRE windows, independent per-key counters, 429 past the limit, fresh window after TTL expiry), **presence** (`PresenceService`/`TypingService` status round-trips, TTL-based expiry, offline/last-seen, INVISIBLE masking, typing indicators), **cache** (`DbCacheService` get/set/`remember` load-through, TTL eviction, del/delMany, null non-caching), **queues** (real BullMQ `Queue`/`Worker`/`QueueEvents`: enqueue→process→completed, typed payload fidelity, failure semantics), and **distributed coordination** (`RedisLockService` NX/PX acquire + atomic compare-and-del release + `runExclusive` mutual exclusion, `RedisPubSubService` cross-client publish→subscribe delivery, `RedisNodeRegistry` register/enumerate/deregister). A dedicated `npm run test:redis` (`jest --config jest-redis.json --runInBand`) runs only these specs; the default `jest` config ignores `*.red-is.spec.ts` (via `testPathIgnorePatterns`) so CI with no Redis stays green.
- **Integration:** kept 40.87's DB harness, 40.86 contracts, and the whole Scale phase intact. Verified the default Jest suite at 98 suites / 633 tests green with tsc 0 errors and `nest build` clean, and the opt-in `npm run test:redis` at 5 suites / 25 tests green against a local Redis (flushed test DB index on teardown; no stray keys left).

**Lecture 40.87 — Database Integration Tests — COMPLETED**
- **Why:** the first five Scale-phase testing lectures (40.87–40.91) shift coverage from pure unit specs (which mock the data layer) to real infrastructure. This lecture introduces true PostgreSQL integration coverage so repository/transaction/constraint/authorization/lifecycle behaviour is verified against the actual schema and DB engine rather than mocks.
- **How:** added `src/testing/db/` — an opt-in real-Postgres harness (`db-test.harness.ts`) that resolves a connection string (`NEXUS_DB_TEST_URL`, else `DATABASE_URL`), creates a per-run throwaway schema, pushes the Prisma schema into it via the local Prisma CLI, and hands back a live `PrismaService` (dropping the schema on teardown). Fixtures (`db-test.fixtures.ts`) seed a deterministic user/server/member/channel graph. Six `*.db-int.spec.ts` suites exercise the real repositories and DB engine across the required areas: **transaction** (atomic multi-write commit + full rollback on mid-transaction failure), **repository** (`ChannelMessageRepository` create/find/cursor-pagination/soft-delete/pin), **constraint** (unique idempotency key, reaction unique key, FK rejection, unique membership, cascade delete), **authorization** (user→role→permission, member→server-role→server-permission, channel overwrite denial), **message lifecycle** (create→read→edit→pin→soft-delete), and **reaction lifecycle** (add/list/remove/count-by-message). A dedicated `npm run test:db` (`jest --config jest-db.json --runInBand`) runs only these specs; the default `jest` config ignores `*.db-int.spec.ts` (via `testPathIgnorePatterns`) so CI with no DB stays green.
- **Integration:** kept 40.77 redaction, 40.78 trace-id, 40.79 `/metrics`, 40.80 load model, 40.81 node registry, 40.82 optimiser, 40.83 cache, 40.84 versioning, and 40.85/40.86 swagger/contracts intact. Verified the default Jest suite at 98 suites / 633 tests green with tsc 0 errors and `nest build` clean, and the opt-in `npm run test:db` at 6 suites / 19 tests green against a real local PostgreSQL (isolated schemas dropped on teardown; no stray schemas left behind).

**Lecture 40.86 — API & WebSocket Contract Tests — COMPLETED**
- **Why:** the API is versioned (40.84) and its docs/validation hardened (40.85); before further endpoints land, the cross-cutting contracts (versions, deprecation headers, the WS event envelope, validation strictness, error frames) must be locked so later changes cannot silently break consumers. No DB/Redis e2e harness exists in CI, so the contract layer is dependency-free.
- **How:** added `src/core/contracts/` — a runtime `ContractManifest` (the "contract disallow-list") aggregating the live version registry, the HTTP versioned-public contract (`/v1/api` & `/v2/api`), the deprecation header contract (`Deprecation`/`Sunset`/`Link`), the WS engine contract (`{ v, data }` envelope, `.v{n}` event suffix, v1 byte-identical), the validation strictness contract (matches `VALIDATION_PIPE_OPTIONS`), and the error-frame contract (`{ success, event, error:{ code, message } }`), exposed via a `@Global` `ContractsModule` + `ContractManifestService`. Added `contract-manifest.spec.ts` that cross-checks the manifest against the real `ApiVersionControlService`, `ws-envelope`, `VALIDATION_PIPE_OPTIONS`, and `WebSocketErrorNormalizer`, plus extended `ws-envelope.spec.ts` with round-trip and event-naming contract invariants.
- **Integration:** kept 40.77 redaction, 40.78 trace-id, 40.79 `/metrics`, 40.80 load model, 40.81 node registry, 40.82 optimiser, 40.83 cache, 40.84 versioning, and 40.85 swagger/validation intact; the manifest shares the live constants so it cannot drift. Verified 98 Jest suites / 633 tests green, tsc 0 errors, nest build clean.

**Next lecture after this: 40.89 (Messaging E2E Tests, exercising the full HTTP + WS messaging surface end-to-end).**
