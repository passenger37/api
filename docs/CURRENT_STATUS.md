# Nexus --- CURRENT_STATUS.md

> **Purpose:** Immediate continuation document for the Nexus backend.
> This file records where development currently stands, what has been
> completed, what is being implemented, known blockers, and the exact
> next step.

------------------------------------------------------------------------

## Project

**Nexus**

Backend-first development of a large-scale social/community platform
with server-based collaboration and a hybrid messaging architecture.

------------------------------------------------------------------------

## Current Stage

**Backend --- Private E2EE Messaging (Signal-style track)**

### Current lecture

**40.81 --- Multi-Instance WebSocket Scaling: Node Registry + Adapter Hardening (Completed)**

The immediate continuation point is now:

``` text
40.85 Completed → verify → 40.86 (next Scale-phase step: API & WebSocket Contract Tests)
```

The authoritative position is `PROJECT_DETAIL.md` §4. The messaging/realtime series through 40.85 (incl. E2EE, search Pt.2, media Pt.2, background jobs, structured logging, distributed tracing, production metrics, the 1M-user load model, multi-instance WebSocket hardening, load-model-driven DB/query optimisation, the Redis-backed cache architecture, API versioning/evolution, and OpenAPI/Swagger hardening) are complete with a green automated test suite. This advances the Scale phase (40.80–40.100).

------------------------------------------------------------------------

## Completed Lecture Summary

| # | Lecture | Status |
|---|---|---|
| 40.9–40.30 | Messaging WebSocket foundation, security, validation, integration tests | ✅ |
| 40.31 | Cursor-Based Message Pagination | ✅ |
| 40.32 | Message Query Optimization (composite indexes + batched reaction counts) | ✅ |
| 40.33 | Composed Thread Read Model (parent anchor + enriched bounded replies) | ✅ |
| 40.34 | Message Edit History (transactional snapshot trail + history route) | ✅ |
| 40.35 | Tombstone Delete Semantics (deleted content suppressed; thread-parent tombstones) | ✅ |
| 40.36 | Mentions (parsing, authorization, anti-abuse cap, indexed mention records) | ✅ |
| 40.37 | Read / Unread State (per-channel moving cursor, forward-only, derived unread count) | ✅ |
| 40.38 | Typing Indicators (ephemeral Redis presence, throttled, per-channel broadcast) | ✅ |
| 40.39 | Message Delivery State (explicit `created` ack; `message-read` fan-out via read cursor) | ✅ |
| 40.40 | Presence Foundation (Redis `user:{id}:presence`, online/idle/offline/dnd/invisible) | ✅ |
| 40.41 | Message/Event Idempotency (`clientMessageId` dedupe, P2002 race recovery) | ✅ |
| 40.42 | WebSocket Reconnection & Missed-Event Sync (`sync-channel` replay with cursor gap detection) | ✅ |
| 40.43 | Event Ordering & Consistency (per-channel `messageSeq`, atomic counter, message `version`) | ✅ |
| 40.44 | Outbox Pattern / Reliable Event Delivery (transactional `OutboxEvent`, polling dispatcher) | ✅ |
| 40.45 | Message Search — Part 1 (Postgres `tsvector` + GIN, server-scoped, keyset cursor) | ✅ |
| 40.46 | Messaging Media/Attachment Backend — Part 1 (signed URLs, R2, CDN, MIME/size validation) | ✅ |
| 40.47 | Messaging Audit and Moderation (report/block/mute/ban, audit logs, E2EE client-side only) | ✅ |
| 40.48 | Advanced Messaging Performance (query/caching pass) | ✅ |
| 40.49 | Server Module Completion (settings, owner delete, self-leave) | ✅ |
| 40.50 | Social Graph Backend (UserCircle, follower counts, suggested users, block cleanup) | ✅ |
| 40.51 | Feed Backend (message-activity feed, auth-aware filtering, composite cursor pagination) | ✅ |
| 40.52 | Authentication and Session Hardening (rate-limited auth, session list/revoke, audit trail) | ✅ |
| 40.53 | Advanced RBAC / Permission Optimization | ✅ |
| 40.54 | Security Hardening (WS + API security review) | ✅ |
| 40.55 | Redis Usage Strategy (production responsibilities cataloged) | ✅ |
| 40.56 | PostgreSQL Index Strategy | ✅ |
| 40.57 | Transaction Boundaries | ✅ |
| 40.58 | Formalize Command/Query CQRS Architecture | ✅ |
| 40.59 | Repository Boundary Hardening | ✅ |
| 40.60 | Domain/Data Mapping | ✅ |
| 40.61 | Distributed WebSocket Scaling — Redis Adapter Foundation | ✅ |
| 40.62 | Direct Message Domain (Type B — standard non-E2EE DMs) | ✅ |
| 40.63 | Private E2EE Messaging Foundation (crypto fundamentals, threat model, Signal architecture) | ✅ |
| 40.64 | E2EE Device and Key Management (`src/modules/e2ee-devices/` register, rotate, revoke) | ✅ |
| 40.65 | Key Distribution Backend (`src/modules/e2ee-key-distribution/` fetch bundles, claim OTKs) | ✅ |
| 40.66 | Session Establishment — X3DH (`src/modules/e2ee-sessions/` establish/accept/list) | ✅ |
| 40.67 | Double Ratchet (`src/modules/e2ee-ratchet/` symmetric KDF chains, X25519 DH ratchet, AES-256-GCM, skipped-message-key cache, bootstrap from 40.66 session) | ✅ |
| 40.68 | E2EE Message Transport (`src/modules/e2ee-transport/` envelope send/fetch, offline delivery queue, ciphertext-only persistence) | ✅ |
| 40.69 | E2EE Multi-Device Support + Key Rotation + Safety-Number Verification (`src/modules/e2ee-devices/` device verification, signed prekey rotation, OTK refill, scheduled tasks, Fingerprint API) | ✅ |
| 40.70 | Secret Groups / E2EE Group Messaging (`src/modules/e2ee-groups/` sender keys protocol, group membership, group sessions, fan-out envelopes) | ✅ |
| 40.71 | E2EE Attachments (`src/modules/e2ee-attachments/` encrypted metadata, client-side encryption, R2/MinIO storage, signed URLs, thumbnails) | ✅ |
| 40.72 | E2EE Offline Delivery + Device Revocation + Encrypted Backup/Recovery Tradeoffs (`src/modules/e2ee-delivery/`, `src/modules/e2ee-revocation/`, `src/modules/e2ee-backup/`, `src/modules/e2ee-key-transparency/` delivery queues, revocation flow, encrypted backups, key transparency) | ✅ |
| 40.73 | E2EE Metadata Minimization (`src/modules/e2ee-metadata/` sealed sender, PIR key fetching, envelope padding, batch delivery, metadata policies) | ✅ |
| 40.74 | Message Search — Part 2 (Advanced: external engine, ranking) (`src/modules/search/` MeiliSearch integration, BM25 ranking, faceted search, E2EE client-side search) | ✅ |
| 40.75 | Media Pipeline — Part 2 (AV scan, thumbnails, transcoding via BullMQ) (`src/modules/media/` BullMQ queues, ClamAV scanning, sharp/ffmpeg thumbnails, ffmpeg transcoding, async processing) | ✅ |
| 40.76 | Background Jobs (BullMQ full set) (`src/modules/jobs/` BullMQ queue/worker infra, enqueue/batch, cancel/retry, cron-style schedules, dead-letter queue, per-queue metrics; registered in `src/app.module.ts`) | ✅ |
| 40.77 | Structured Logging (`src/core/logger/` pino redact "never log" list, `StructuredLogger` + `withDuration` helper, userId/reqId in request logs via serializer+customProps, structured GlobalExceptionFilter error logs, jobs module queue/job correlation: jobId/queueName/durationMs) | ✅ |
| 40.78 | Distributed Tracing (`src/core/tracing/` AsyncLocalStorage `TraceService` + `TraceMiddleware` (x-trace-id), traceId aligned to request id via pino genReqId/customProps, auto-traceId on every `StructuredLogger` line, BullMQ job `__trace` propagation + worker/QueueEvents restore, outbox `__trace` payload propagation request→outbox→WS) | ✅ |
| 40.79 | Production Metrics (`src/core/metrics/` in-memory `MetricsService` counters + histograms, `GET /metrics` Prometheus text endpoint, `HttpMetricsInterceptor` request throughput/latency/error rate by method+route+status, jobs module enqueue/processed/failed/worker-duration metrics fed from the 40.77 structured fields) | ✅ |
| 40.80 | 1M-User Load Model (`src/core/load-model/` typed 1M-user workload spec (1M registered, 4% concurrency curve, per-op REST mix + async job mix, connection limits), `LoadModelService` derived targets + live baseline vs SLOs, `GET /load-model` + `GET /load-model/baseline`, `scripts/load/load-baseline.mjs` dependency-free runner, `MetricsService.percentiles`/`aggregatePercentiles` latency SLO maths) | ✅ |
| 40.81 | Multi-Instance WebSocket Scaling (`src/core/redis/redis-node-registry.ts` Redis-backed node registry with heartbeat TTL + deregistration, `resolveNodeId`/`nodeHeartbeatTtlSec` helpers, `GET /instances` cluster view; `RedisIoAdapter` per-instance named pub/sub clients (`redisIoClientName`), `instanceId()`, graceful `disconnect()`; `main.ts` shutdown hooks disconnect the adapter + deregister the node) | ✅ |

Verification for 40.68: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.69: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.70: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.71: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.72: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.73: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.74: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.75: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds.
Verification for 40.76: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds. Registered `JobsModule` in `src/app.module.ts` (jobs module is now an active app module; introduces a Redis boot dependency via BullMQ Queue/Worker connections in `JobsQueueService.onModuleInit()`).
Verification for 40.77: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds. `AppLoggerModule` (global) now provides + exports `StructuredLogger` (injects `PinoLogger`); `GlobalExceptionFilter` is constructed in `main.ts` with `app.get(StructuredLogger)`.
Verification for 40.78: `Found 0 errors` (tsc), 84 Jest suites / 536 tests passing, `nest build` succeeds. `TracingModule` (global, imported before `AppLoggerModule`) provides `TraceService` + `TraceMiddleware` (x-trace-id, ALS); pino `genReqId`/`customProps` reuse `req.traceId`; `StructuredLogger` emits `traceId`/`parentId` automatically.
Verification for 40.79: `Found 0 errors` (tsc), 86 Jest suites / 552 tests passing, `nest build` succeeds. `MetricsModule` (global) provides `MetricsService` + `MetricsController` (`GET /metrics` Prometheus text); `HttpMetricsInterceptor` registered as a global `APP_INTERCEPTOR` alongside `ResponseInterceptor`.
Verification for 40.80: `Found 0 errors` (tsc), 87 Jest suites / 566 tests passing, `nest build` succeeds. `LoadModelModule` (global) provides `LoadModelService` + `LoadModelController` (`GET /load-model`, `GET /load-model/baseline`) on top of `MetricsService`; `MetricsService` gains `percentiles`/`aggregatePercentiles` latency helpers (used for latency SLO evaluation).
Verification for 40.81: `Found 0 errors` (tsc), 89 Jest suites / 578 tests passing, `nest build` succeeds. `RedisNodeRegistry` (global) + `GET /instances`; `RedisIoAdapter` per-instance named pub/sub clients + instance id + graceful `disconnect()`; `main.ts` enableShutdownHooks so the process deregisters its node and closes adapter connections on SIGINT/SIGTERM.

-----------------------------------------------------------------------

## Current Task

## 40.81 --- Multi-Instance WebSocket Scaling: Node Registry + Adapter Hardening (COMPLETED)

### What was built
Full-horizontal-scaling readiness for the WebSocket layer, hardening the 40.61 Redis adapter so a cluster can enumerate and cleanly manage its API nodes. No new dependency:
- `src/core/redis/redis-node-registry.ts` — `RedisNodeRegistry` (global provider): each running API node registers itself in Redis with a **heartbeat TTL** (`SET node:{id} {json} EX {ttl}`), renews on an interval (unref'd so it doesn't hold the event loop), deregisters on graceful shutdown (`OnModuleDestroy`), and can `listInstances()`/`countInstances()` live nodes for a scaling controller / load balancer. `resolveNodeId()` derives a stable per-process id from `NODE_ID` env or a `hostname:pid:rand` fallback; `nodeHeartbeatTtlSec()` reads `NODE_HEARTBEAT_TTL_SEC` (default 30s)
- `src/core/redis/redis-io.adapter.ts` — `RedisIoAdapter` refinements: per-instance named pub/sub clients (`socket.io:{pub|sub}:{nodeId}`) so `CLIENT LIST` reveals which node owns which socket.io shard, `instanceId()`, and a graceful `disconnect()` that closes the duplicated clients instead of leaking them
- `src/core/redis/redis-node.controller.ts` — `@Public() GET /instances` → `{ instanceId, nodeCount, nodes }` cluster view
- `src/core/redis/redis-keys.ts` — `node(id)` + `nodesPattern()` key helpers (respecting `REDIS_KEY_PREFIX`)
- `src/core/redis/redis.module.ts` — registers `RedisNodeRegistry` (provider + export) and `RedisNodeController`
- `src/main.ts` — `app.enableShutdownHooks()`, logs `NODE_ID`, and on SIGINT/SIGTERM disconnects the adapter then closes the app (so the node deregisters cleanly)
- Tests — `redis-node-registry.spec.ts` (id/TTL resolution, register/deregister, list sorted, count, malformed-record skip) + `redis-io.adapter.spec.ts` (client-name builder, instance id, graceful disconnect)

### Integration note
`RedisNodeRegistry` reuses the existing `RedisService`, so it needs no new connections and is globally injectable. The registry is advisory — a crashed node simply stops renewing its TTL and drops out; sockets remain balanced by the Redis socket.io adapter key (shared across instances), so scaling out is just launching more nodes. The `/instances` endpoint is `@Public()` like `/metrics`/`/load-model`. The 40.77 redaction, 40.78 trace propagation, 40.79 `/metrics`, and 40.80 load model are all untouched.

### Verification
- TypeScript: `Found 0 errors`
- Build: `nest build` succeeds
- Tests: 89 Jest suites / 578 tests passing

-----------------------------------------------------------------------

## Next Task

## The cache, API versioning / evolution, and OpenAPI/Swagger hardening are COMPLETE.

## 40.85 --- OpenAPI/Swagger Hardening --- COMPLETED (`src/config/swagger/` `buildSwaggerConfig(version)` with tags/servers/security + `info.version` tied to the API version; `src/config/validation/` `VALIDATION_PIPE_OPTIONS` strict contract; removed dead `src/prisma.controller.ts` `TestController`). Next task: 40.86 (API & WebSocket Contract Tests).

------------------------------------------------------------------------

## Major Phase After E2EE Transport

After 40.68–40.73 (E2EE series), the sequence continues:
- 40.70 Secret Groups / E2EE Group Messaging
- 40.71 E2EE Attachments
- 40.72 E2EE Offline Delivery + Device Revocation + Encrypted Backup/Recovery Tradeoffs
- 40.73 E2EE Metadata Minimization
- 40.74 Message Search — Part 2 (Advanced: external engine, ranking) ✅
- 40.75 Media Pipeline — Part 2 (AV scan, thumbnails, transcoding via BullMQ) ✅
- 40.76 Background Jobs (BullMQ full set) ✅
- 40.77 Structured Logging ✅
- 40.78 Distributed Tracing ✅
- 40.79 Production Metrics ✅
- 40.80 1M-User Load Model ✅
- 40.81 Multi-Instance WebSocket Scaling (node registry + adapter hardening) ✅
- 40.82 Load-model-driven DB/query optimisation (`src/core/db/query-optimizer/`, `GET /load-model/optimiser`) ✅
- 40.83 Cache Architecture (`src/core/cache/`, `GET /load-model/cache`) ✅
- 40.84 API Versioning / Evolution (`src/core/api-versioning/`, `GET /v1/api` & `GET /v2/api`, `ws-envelope`) ✅
- 40.85 OpenAPI/Swagger Hardening (`buildSwaggerConfig`, `VALIDATION_PIPE_OPTIONS`) ✅
- 40.86–40.100 Scale, Performance, Testing, Production, Backend Feature Freeze (next: 40.86 — API & WebSocket Contract Tests)
- 40.101–40.104 Admin / Feature Flags / AI
- **FRONTEND START GATE**

------------------------------------------------------------------------

## Hybrid Messaging Decision (Locked)

Nexus uses a hybrid messaging architecture:

1. Cloud-based server/community channels
2. Standard cloud-backed direct messages
3. Private E2EE direct messages using the Signal Protocol
4. Secret/private groups

Normal server/community messaging is cloud-backed and server-controlled.
Private E2EE messaging is a separate security model — the backend must not receive plaintext private E2EE message content.

------------------------------------------------------------------------

## E2EE Future Work (Post-Transport)

- 40.77: Structured Logging ✅
- 40.78: Distributed Tracing ✅
- 40.79: Production Metrics ✅ (observability track 40.77–40.79 complete)

Do not invent cryptographic primitives or create an ad-hoc replacement for Signal Protocol.

------------------------------------------------------------------------

## Frontend Status

Frontend development has **not started as the active development phase**.
The agreed development strategy is backend-first.
Frontend should begin after the agreed backend milestone is complete and the relevant backend contracts are stable.

------------------------------------------------------------------------

## Current Known Blockers / Open Questions

### Blocker 1 — E2EE library selection — RESOLVED ✅
`@signalapp/libsignal-client` ADR spike completed successfully. Library verified for:
- Node.js runtime (WASM + native prebuilds)
- X3DH, Double Ratchet, Kyber PQ, Sealed Sender, Sender Keys
- Wire-compatible Signal Protocol artifacts
- Active maintenance (v0.101.2, AGPL-3.0-only)
Ready for 40.68 implementation.

### Open Question 2 — Exact production infrastructure
Exact final production deployment topology: `[UNKNOWN]`

------------------------------------------------------------------------

## Commands Previously Used

``` text
pnpm start:dev
```

The NestJS watcher has been used to catch TypeScript compilation errors.
A successful state shows: `Found 0 errors.`

------------------------------------------------------------------------

## Required Continuation Workflow

For every next lecture:
1. Explain what is being built.
2. Explain why it belongs at this point.
3. Show the exact folder/file path.
4. Inspect existing code before modifying it.
5. Explain integration with existing services.
6. Implement only the current lecture.
7. Compile with: `pnpm start:dev`
8. Fix only errors caused by the current implementation.
9. Test the behavior.
10. Create a focused Git commit.

Do not generate the entire remaining project in one step.

------------------------------------------------------------------------

## Git Checkpoint

The project uses focused commits for implementation milestones.
The next commit should describe the actual completed change rather than claiming completion before testing.

------------------------------------------------------------------------

## Important Rules for the Next AI

- Read the project's roadmap/status before continuing.
- Treat locked architecture decisions as fixed.
- Do not invent missing code.
- Ask for the current file when the exact implementation is unknown.
- Keep message command/query responsibilities separate.
- Keep message and reaction repositories separate.
- Keep Redis as an infrastructure/ephemeral layer, not durable message storage.
- Never trust client-supplied identity or permissions.
- Validate WebSocket DTOs before executing commands.
- Authorize channel access before message operations.
- Preserve the backend-first workflow.
- Do not begin frontend implementation unless the backend start gate has been reached or explicitly changed.
- Never expose or store secrets, tokens, passwords, or `.env` values.

------------------------------------------------------------------------

## Immediate Continuation

**Next task: 40.86 — (API & WebSocket Contract Tests, next Scale-phase step).** 40.85 is complete.

The scale/performance/testing/production phase (40.80–40.100) has progressed: **40.80 1M-User Load Model** (`src/core/load-model/`, `GET /load-model` + `GET /load-model/baseline`, `scripts/load/load-baseline.mjs`), **40.81 Multi-Instance WebSocket Scaling** (`RedisNodeRegistry` + per-instance named adapter clients + graceful shutdown, `GET /instances`), **40.82 Load-model-driven DB/query optimisation** (`src/core/db/query-optimizer/` + `GET /load-model/optimiser` + `add_query_index_strategy_phase3` partial indexes), **40.83 Cache Architecture** (`src/core/cache/` — `DbCacheService` Redis cache-aside with TTL + hit/miss metrics, `CacheArchitectureService` deciding what/why/TTL/invalidation/consistency from the load model's `db` read/write split, `GET /load-model/cache`; cache keys + `CACHE_TTL` in `redis-keys.ts`; server-member-count read path wired with write-through invalidation on join; runner captures in `scripts/load/query-optimiser.mjs` / `scripts/load/load-baseline.mjs`), **40.84 API Versioning / Evolution** (`src/core/api-versioning/` — data-driven `ApiVersionControlService` + registry, app-wide `DeprecationHeaderInterceptor` attaching `Deprecation`/`Sunset`/`Link` to `/v1`, `GET /v1/api` & `GET /v2/api` co-existence, backward-compatible `ws-envelope.ts` for WS event evolution), and **40.85 OpenAPI/Swagger Hardening** (`src/config/swagger/` `buildSwaggerConfig(version)` with tags/servers/security and `info.version` tied to the API version; `src/config/validation/` strict `VALIDATION_PIPE_OPTIONS`; removed dead `src/prisma.controller.ts`) are complete at 97 suites / 624 tests. Every 40.82+ change keeps the 40.77 redaction, 40.78 trace-id propagation, the 40.79 `/metrics` endpoint, the 40.80 load model, and the 40.81 node registry intact, and is confirmed by re-running `scripts/load/load-baseline.mjs` / `scripts/load/query-optimiser.mjs`.