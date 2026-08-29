# Nexus — PROJECT_DETAIL.md
## Consolidated Master Roadmap (v2 — Full Merge)

**Sources merged into this version:**
- `PROJECT_FUTURE_BACKEND_IMPLEMENTATION.md` (Doc B1)
- `PROJECT_FUTURE_BACKEND_IMPLEMENTATION_2.md` (Doc B2)
- `PROJECT_FUTURE_FRONTEND_IMPLEMENTATION.md` (Doc F)
- `ROADMAP.md` + prior `CURRENT_STATUS.md` (absorbed into v1 of this file — original not re-uploaded, so v1's content is treated as the authoritative record of what ROADMAP.md said)

**Merge rule (unchanged):** Implement every feature from all sources. Where a lecture number is claimed by more than one source with **different** content, both intents are implemented — as either a combined lecture or two sequential lectures — scheduled at the point that makes technical sense, not necessarily at the original number. Where sources describe the **same** feature under different numbers, they are treated as one lecture and deduplicated. Every renumbering is cross-referenced back to its original source/number below so nothing is silently dropped.

**Current backend position:** Lecture 40.40 — Presence Foundation (next)
**Completed:** 40.9–40.27 (foundational messaging/gateway lectures, see §3), 40.28 (WebSocket security hardening), 40.29 (WebSocket security/error-contract completion), 40.30 (Messaging Integration Test Boundary + WebSocket Connection Lifecycle), 40.31 (Cursor-Based Message Pagination), 40.32 (Message Query Optimization — composite indexes + batched reaction counts), 40.33 (Message Thread / Reply Queries — composed thread read model), 40.34 (Message Edit History — non-destructive snapshot trail), 40.35 (Message Delete Semantics — tombstones/suppressed content), 40.36 (Mentions — parsing, authorization, anti-abuse cap, indexed mention records), 40.37 (Read / Unread State — per-channel moving cursor + derived unread count), 40.38 (Typing Indicators — ephemeral Redis presence + throttled typing-start/stop), 40.39 (Message Delivery State — created ack contract + realtime message-read fan-out via the read cursor)

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
| 40.43 *(current)* | Event Ordering & Consistency (`eventId`, `sequence/version`, stale-update detection) | B1 concept §41, B2 40.43 |
| 40.44 | Outbox Pattern / Reliable Event Delivery | B2 40.40 (**CONFLICT with v1 40.40 "Distributed WebSocket Scaling"** — both implemented; scaling moved to §4.4 below since it depends on presence/outbox existing first) |

**Search — split in two (genuine sequencing conflict):** v1/B1 want basic search early (right after threads); B2 defers all search to its Phase 35 (after E2EE and media). Both are implemented, split by scope:
- **40.45 Message Search — Part 1 (Basic):** Postgres full-text/`ILIKE` search over community-channel (Type A) messages. *(v1 40.33, B1 40.34)*
- **Message Search — Part 2 (Advanced):** external search engine evaluation, ranking, ships later in §4.6. *(B2 40.64)*

**Attachments — split in two (same kind of conflict):** v1 wants full signed-URL/R2/CDN/AV-scan/thumbnail pipeline early (needed once threads/mentions exist); B2 defers heavy media processing to its Phase 36 background-jobs era. Split:
- **40.46 Messaging Media/Attachment Backend — Part 1 (Basic upload path):** signed URLs, Cloudflare R2, CDN, MIME validation, size limits. *(v1 40.37, B1 concept §49)*
- **Media Pipeline — Part 2 (Advanced processing):** antivirus scan, thumbnail generation, transcoding, all via BullMQ. Moved to §4.6 with Background Jobs. *(B2 40.65, v1 40.37's AV/transcode detail)*

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.47 | Messaging Audit and Moderation — report/block/mute/ban, spam detection, abuse rate limiting, audit logs; explicit note that E2EE (Type C/D) moderation is client-side/metadata-only, never server decryption | v1 40.38, B1 §51 (fuller detail merged in) |
| 40.48 | Advanced Messaging Performance (query/caching pass once full feature set exists) | v1 40.39 |

### 4.2 Server/Social/Feed/Auth Completion

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.49 | Server Module Completion | v1 40.41 |
| 40.50 | Social Graph Backend | v1 40.42, B1 Phase 4 |
| 40.51 | Feed Backend | v1 40.43, B1 Phase 6 |
| 40.52 | Authentication and Session Hardening | v1 40.44 |
| 40.53 | Advanced RBAC / Permission Optimization | v1 40.45 |
| 40.54 | Security Hardening — WebSocket Security Review + API Security Hardening | v1 40.46, B2 40.52/40.53 |

### 4.3 Redis / Database / Code-Architecture Formalization

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.55 | Redis Usage Strategy (production responsibilities: cache, sessions, rate limit, presence, typing, pub/sub, locks, job coordination) | B2 40.46, B1 concept §47 |
| 40.56 | PostgreSQL Index Strategy | B2 40.47 |
| 40.57 | Transaction Boundaries | B2 40.48 |
| 40.58 | Formalize Command/Query (CQRS) Architecture | B2 40.49 |
| 40.59 | Repository Boundary Hardening | B2 40.50 |
| 40.60 | Domain/Data Mapping | B2 40.51 |

### 4.4 Distributed / Scaling Foundation (moved later — depends on 4.1–4.3)

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.61 | Distributed WebSocket Scaling — Redis adapter foundation | v1 40.40 (**this is the other half of the 40.44/40.40 conflict noted above**) |

### 4.5 Private Messaging & E2EE (dedup B2 Phase 24–34 with B1's 16-lecture E2EE sequence)

B1 numbers E2EE as a separate "E2EE Lecture 1–16" track; B2 folds it into the main 40.x sequence at 40.54–40.63. Merged below on B2's numbering, with B1's extra granularity inserted as sub-items where B2 has no equivalent lecture.

| # | Lecture | Originally numbered as |
|---|---|---|
| 40.62 | Direct Message Domain (Type B — standard, non-E2EE DMs) | B2 40.54 |
| 40.63 | Private E2EE Messaging Foundation — crypto fundamentals, threat model, Signal Protocol architecture | B2 40.55, B1 E2EE-1/2/3 |
| 40.64 | E2EE Device and Key Management — multi-device identity keys | B2 40.56, B1 E2EE-4 |
| 40.65 | Key Distribution Backend — prekey server | B2 40.57, B1 E2EE-5 |
| 40.66 | Session Establishment | B2 40.58, B1 E2EE-6 |
| 40.67 | Double Ratchet | B2 40.59, B1 E2EE-7 |
| 40.68 | E2EE Message Transport — encryption/decryption + encrypted persistence | B2 40.61, B1 E2EE-8 |
| 40.69 | E2EE Multi-Device Support + Key Rotation + Safety-Number Verification | B1 E2EE-9/10/11 (**not broken out in B2 — inserted here**) |
| 40.70 | Secret Groups / E2EE Group Messaging | B2 40.60, B1 E2EE-12 |
| 40.71 | E2EE Attachments | B2 40.62, B1 E2EE-13 |
| 40.72 | E2EE Offline Delivery + Device Revocation + Encrypted Backup/Recovery Tradeoffs | B1 E2EE-14/15/16 (**not broken out in B2 — inserted here**) |
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
| 40.87 | Database Integration Tests | B2 40.77 |
| 40.88 | Redis Integration Tests | B2 40.78 |
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
10. **40.40** Presence Foundation — current.
7. Continue sequentially through **§4.1–§4.8** as tabulated above.
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

**Lecture 40.40 — Presence Foundation.**

Briefing required before implementation:
- **Why:** the roadmap's presence intent (B1 40.27, B2 40.39, B1 concept §43) wants per-user lifecycle state — online / idle / offline / dnd / invisible + last seen — visible across the app, driven by socket lifecycle, not by PostgreSQL writes on every heartbeat.
- **How:** Redis-backed presence keys (`user:{id}:presence` with TTL + `last_seen`) set on gateway connection and refreshed on activity/heartbeat; broadcast `presence-change` to shared rooms; offline derived from TTL expiry rather than stored. Typing (40.38) and connection state compose with the same Redis instance.
- **Drawbacks/Alternatives:** socket-state-only presence (flaky across devices), PostgreSQL presence rows (write amplification), Redis TTL presence (cheap, self-correcting — chosen). Distinct from typing (40.38) and delivery state (40.39).

Proceed after briefing approval. **Next lecture after this: 40.41 — Message/Event Idempotency (`clientMessageId`, dedupe on retry).**
