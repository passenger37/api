# PROJECT_FUTURE_BACKEND_IMPLEMENTATION.md

# Nexus — Future Backend Implementation Master Plan

> **Purpose:** This document is the standalone backend engineering roadmap for Nexus. It is intended to allow development to continue without depending on the original ChatGPT conversation.

> **Status (synced with `PROJECT_DETAIL.md`, the live master roadmap):** Implementation has advanced well beyond the low lecture numbers described below. The messaging/realtime series is **COMPLETED through Lecture 40.81 - Multi-Instance WebSocket Scaling** (master B2 40.71 / PHASE 40 in this document), advancing the Scale phase (40.80–40.100). Implemented and shipped: the `/messages` gateway suite, WS error contract + exception filter, connection/auth guard + rate limiting, cursor pagination & history, read/unread state, typing, Redis-backed presence, reconnect/missed-event sync, idempotent sending, attachments, mentions, search part 1 & part 2 (MeiliSearch), transactional outbox, negative/security tests, CQRS/repository/mapper hardening, security hardening, the **Redis socket.io adapter foundation**, the full Direct Message Domain (`src/modules/direct-messages/` — `/dm` REST + `dm-open|send|sync|read` WS events, rooms `dm:${channelId}`), the E2EE series (40.63–40.73), Message Search Part 2 (`src/modules/search/`), Media Pipeline Part 2 (`src/modules/media/`), Background Jobs (`src/modules/jobs/`), Structured Logging (`src/core/logger/`), Distributed Tracing (`src/core/tracing/`), Production Metrics (`src/core/metrics/`), the 1M-User Load Model (`src/core/load-model/` + `scripts/load/load-baseline.mjs`), and Multi-Instance WebSocket Scaling (`src/core/redis/redis-node-registry.ts` + `RedisIoAdapter` per-instance named clients + graceful shutdown). **Current lecture: 40.82 — (Load-model-driven DB/query optimisation, next Scale-phase step)** (B2 40.72). **Completed: 40.81 — Multi-Instance WebSocket Scaling** — `src/core/redis/redis-node-registry.ts` (Redis-backed node registry, heartbeat TTL, deregistration, `GET /instances` cluster view) + `RedisIoAdapter` per-instance named pub/sub clients (`redisIoClientName`), `instanceId()`, and graceful `disconnect()` + `main.ts` shutdown hooks (89 suites / 578 tests green). The lecture-lists and status sections (18, 19, 20) below are updated accordingly; per-lecture feature bodies above them remain reference notes.

---

# 1. Project Direction

## Project

**Nexus**

## Current development rule

**BACKEND FIRST — FRONTEND DOES NOT START UNTIL THE BACKEND IS COMPLETE AND STABILIZED.**

The backend must reach a production-ready state across:

- Authentication
- Authorization
- Users
- Social graph
- Organizations
- Servers
- Channels
- Messaging
- Notifications
- Redis/performance
- Security
- Reliability
- Private/E2EE messaging foundations
- Testing
- Observability
- Production hardening

Only after these backend modules are sufficiently complete should frontend implementation begin.

---

# 2. Locked Architecture Principles

These are not ordinary roadmap suggestions. They are existing Nexus architectural decisions.

## 2.1 Modular Monolith

Nexus backend remains a **modular monolith** at this stage.

The codebase is divided into business modules rather than immediately splitting into microservices.

Reason:

- easier development
- easier local debugging
- simpler transactions
- simpler deployment
- lower operational complexity
- clear module boundaries
- allows future extraction of high-load modules if required

Do not introduce microservices merely because the target is 1M users.

---

# 3. Backend Technology Direction

## Core backend

- NestJS
- TypeScript
- Node.js

## Database

- PostgreSQL
- Prisma

## Cache / distributed state

- Redis

## Realtime

- Socket.IO
- WebSocket Gateway
- Redis-backed scaling will be required when horizontally scaling WebSocket servers

## Authentication

- JWT-based authentication
- Refresh-token/session architecture
- server-side session/token invalidation capability
- WebSocket JWT authentication

## Authorization

- RBAC
- server roles
- permission checks
- membership validation
- service-layer authorization

## Validation

- class-validator
- class-transformer
- DTOs
- WebSocket validation pipe
- gateway-wide validation

## Infrastructure already used/discussed

- Docker
- PostgreSQL container
- Redis container
- MinIO
- pgAdmin
- Cloudflare R2
- CDN
- VPS/cloud infrastructure

## Future production infrastructure

Exact provider is:

**[UNKNOWN]**

Do not lock AWS/Azure/GCP until deployment requirements and cost are finalized.

---

# 4. Backend Engineering Philosophy

Every feature follows:

```text
Requirement
    ↓
Architecture
    ↓
Domain model
    ↓
Database model
    ↓
DTO
    ↓
Validation
    ↓
Authorization
    ↓
Service
    ↓
Repository
    ↓
Controller / Gateway
    ↓
Events
    ↓
Caching / Redis where required
    ↓
Tests
    ↓
Observability
    ↓
Performance testing
    ↓
Production hardening
```

Never implement only the controller/gateway.

---

# 5. Standard Module Structure

The preferred domain-first structure is:

```text
src/
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── websocket/
│   ├── decorators/
│   ├── exceptions/
│   └── utils/
│
├── config/
│
├── core/
│   ├── prisma/
│   ├── redis/
│   ├── logger/
│   └── security/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── social/
│   ├── organizations/
│   ├── servers/
│   ├── messages/
│   ├── notifications/
│   └── ...
│
└── app.module.ts
```

Inside a business module:

```text
module/
├── controllers/
├── gateways/
├── dto/
├── services/
├── repositories/
├── queries/
├── commands/
├── mappers/
├── types/
├── constants/
├── exceptions/
├── guards/
└── module.ts
```

Exact structure can evolve only when it improves consistency with the existing project.

---

# 6. Current Messaging Architecture

Current messaging backend uses:

```text
ChannelMessageGateway
        │
        ├── DTO validation
        ├── WebSocket authentication
        ├── rate limiting
        ├── channel access validation
        │
        ▼
Command Services
        │
        ▼
Query Services
        │
        ▼
Repositories
        │
        ▼
Prisma/PostgreSQL
```

Current gateway has:

```text
/messages
```

namespace.

Existing events include:

```text
join-channel
leave-channel
send-message
edit-message
delete-message
pin-message
unpin-message
add-reaction
remove-reaction
get-message-reactions
get-reaction-counts
```

Existing broadcast events include:

```text
message-created
message-updated
message-deleted
message-pinned
message-unpinned
reaction-added
reaction-removed
```

The current gateway uses:

```text
WebSocketJwtGuard
WebSocketValidationPipe
WebSocketExceptionFilter
WebSocketRateLimitService
```

The current code therefore already establishes the foundation for the production WebSocket architecture.

Since this section was written, the architecture has grown (all shipped as of **40.62**, completed):

```text
PresenceService          Redis-backed presence (online/idle/offline/dnd/invisible)
TypingService            typing indicators per channel
OutboxService            transactional outbox + 500ms polling dispatcher
MessageSequenceService   per-channel messageSeq + ServerChannel.lastMessageSeq counter
MessagesQueryService     cursor pagination, history, read-state, search part 1
DmGateway (namespace /dm)  dm-open | dm-send | dm-sync | dm-read
DmCommandService/DmQueryService   open, send, edit, delete, markRead, list, history, sync
DirectMessageRepositories         canonical pair (userAId < userBId), clientMessageId dedupe
RedisIoAdapter           cross-instance socket.io broadcast adapter (Redis adapter foundation)
```

Existing broadcast/events now also include `messageSeq`, message `version` (optimistic concurrency editing), `sync-channel` replay, `typing-*`, presence updates, and the `/dm` namespace events listed above.

---

# 7. Important Current Gateway Rule

The current gateway has:

```text
@UseGuards(WebSocketJwtGuard)
@UsePipes(WebSocketValidationPipe)
@UseFilters(WebSocketExceptionFilter)
```

This means the next improvements should **strengthen this architecture rather than replace it**.

Do not create a second unrelated validation system.

Do not create a second authentication system.

Do not duplicate authorization in the gateway unnecessarily.

---

# PHASE 1 — COMPLETE CURRENT WEBSOCKET HARDENING

## Objective

Finish the current channel messaging WebSocket foundation before adding advanced messaging features.

---

## Lecture 40.28.9 — Gateway-Wide WebSocket Validation

### Status

Completed.

### Existing implementation

```text
WebSocketValidationPipe
```

uses:

- `plainToInstance`
- `class-validator`
- `whitelist`
- `forbidNonWhitelisted`

### Why

Every gateway DTO should be validated consistently.

---

# Lecture 40.28.10 — WebSocket Negative & Security Tests

### Status

Current / next implementation.

### Objective

Prove that invalid and malicious WebSocket requests are rejected.

### Tests

Test:

```text
invalid DTO
missing DTO fields
wrong UUID
wrong data types
oversized content
unknown properties
unauthenticated socket
invalid token
non-member
unauthorized operation
invalid message
invalid channel
rate-limit exhaustion
room isolation
```

### Tools

Use the project's existing testing stack.

Testing framework:

**[UNKNOWN]**

If Jest is already configured, use Jest rather than introducing another framework.

### Definition of done

All existing gateway operations have negative/security coverage.

---

# PHASE 2 — WEBSOCKET ERROR ARCHITECTURE

## Lecture 40.29 — WebSocket Error Contract & Error Normalization

### Objective

Make all WebSocket errors predictable.

Current errors can originate from:

```text
DTO
Guard
Rate limiter
Validation service
Command service
Repository
Prisma
```

Create one normalized WebSocket error model.

Concept:

```text
success: false

error:
    code
    message
```

### New concepts

- Error normalization
- Machine-readable error codes
- Transport/domain error separation
- Exception mapping

### Files

Preferred:

```text
src/common/websocket/errors/
├── websocket-error-code.enum.ts
├── websocket-error.types.ts
└── websocket.exception.ts
```

### Do not

Do not expose:

- stack traces
- Prisma internals
- SQL errors
- Redis internals
- secrets
- tokens

---

# PHASE 3 — WEBSOCKET CONNECTION LIFECYCLE

## Lecture 40.30 — WebSocket Connection Lifecycle

### Objective

Move beyond message events and properly model socket lifecycle.

Study:

```text
connect
authenticate
initialize socket state
join rooms
disconnect
reconnect
cleanup
```

### New concepts

- connection lifecycle
- socket state
- connection metadata
- reconnect behavior
- cleanup

### Future socket state

Conceptually:

```text
Socket
├── userId
├── sessionId
├── connectionId
└── subscribed rooms
```

Exact fields:

**[UNKNOWN]**

Do not add fields until required.

---

# PHASE 4 — MESSAGE QUERY PERFORMANCE

## Lecture 40.31 — Cursor-Based Message Pagination

### Objective

Build production-grade message history retrieval.

Do not use:

```text
OFFSET 100000
```

for deep message history.

Use cursor pagination.

Concept:

```text
latest messages
      ↓
cursor
      ↓
older messages
      ↓
next cursor
```

### Technologies

- PostgreSQL
- Prisma
- indexed timestamp/message ID
- cursor pagination

### New concepts

- cursor pagination
- stable ordering
- pagination consistency

---

# Lecture 40.32 — Message Query Optimization

### Objective

Optimize message retrieval for large channels.

Study:

- composite indexes
- query plans
- `EXPLAIN ANALYZE`
- selective columns
- projection
- avoiding N+1 queries
- batching

### Production rule

Do not load:

```text
message
+ entire author
+ entire server
+ entire channel
+ every reaction
+ every attachment
```

for every list request.

Return only required fields.

---

# PHASE 5 — THREADS AND MESSAGE RELATIONSHIPS

## Lecture 40.33 — Threads / Replies

### Objective

Build structured message conversations.

Existing system already has:

```text
parentMessageId
```

Use that foundation.

Study:

- parent/child relationship
- thread root
- reply count
- thread retrieval
- authorization

### Database rule

Do not destroy historical relationships unnecessarily.

---

# PHASE 6 — MESSAGE HISTORY & EDITING

## Lecture 40.34 — Message Edit History

### Objective

Move beyond simply changing:

```text
content
```

toward historical message state.

Study:

- audit records
- immutable history
- edited timestamps
- editor identity

Exact database structure:

**[UNKNOWN]**

Do not invent it until schema design.

---

# Lecture 40.35 — Message Delete Semantics

Define:

```text
hard delete
soft delete
tombstone
```

The final choice must respect existing Nexus history/audit principles.

Exact final deletion strategy:

**[UNKNOWN]**

Do not implement a new deletion model until explicitly decided.

---

# PHASE 7 — MESSAGE FEATURES

## Lecture 40.36 — Mentions

Build:

```text
@user
@role
@everyone
```

only according to finalized Nexus requirements.

Study:

- mention parsing
- authorization
- notification generation
- anti-abuse
- indexing

---

# Lecture 40.37 — Unread Message State

Build unread tracking.

Study:

```text
lastReadMessageId
lastReadAt
unreadCount
```

Exact final model:

**[UNKNOWN]**

Potential Redis usage should be evaluated only after measuring workload.

---

# PHASE 8 — MESSAGE DELIVERY STATE

## Lecture 40.38 — Message Delivery State

Separate:

```text
created
delivered
read
```

Do not assume that WebSocket emission means message delivery.

Study:

- delivery acknowledgment
- reconnect synchronization
- duplicate events
- read receipts

---

# PHASE 9 — PRESENCE

## Lecture 40.39 — Presence Architecture

Study:

```text
online
offline
away
last seen
```

Redis becomes important here.

Do not store rapidly changing presence state exclusively in PostgreSQL.

Concept:

```text
Socket
   ↓
Redis presence
   ↓
TTL / heartbeat
```

---

# PHASE 10 — RELIABLE EVENT DELIVERY

## Lecture 40.40 — Outbox Pattern

This is a major production architecture lecture.

Problem:

```text
DB transaction succeeds
        ↓
event broadcast fails
```

or:

```text
event succeeds
        ↓
DB transaction fails
```

The outbox pattern provides reliable event publication.

Study:

- transactional outbox
- event persistence
- publisher worker
- retries
- idempotency

Architecture:

```text
Command
   ↓
DB transaction
   ├── business data
   └── outbox event
            ↓
       publisher
            ↓
       event transport
```

---

# PHASE 11 — IDEMPOTENCY

## Lecture 40.41 — Message/Event Idempotency

### Problem

Clients reconnect.

Networks retry.

Requests can be duplicated.

Therefore:

```text
same request
    ↓
received twice
```

must not create two messages unintentionally.

Study:

- idempotency keys
- unique constraints
- duplicate event suppression
- retry semantics

---

# PHASE 12 — RECONNECTION & SYNCHRONIZATION

## Lecture 40.42 — WebSocket Reconnection & Message Synchronization

When a client disconnects:

```text
messages may have been missed
```

Therefore reconnect should support:

```text
last known event/message
        ↓
server determines missing events
        ↓
client synchronizes
```

Study:

- reconnect protocol
- sequence numbers
- cursors
- event replay
- gap detection

---

# PHASE 13 — EVENT ORDERING

## Lecture 40.43 — Event Ordering & Consistency

Distributed WebSocket servers can produce:

```text
Event A
Event B
```

but clients may receive:

```text
B
A
```

Study:

- event sequence numbers
- monotonic ordering
- per-channel ordering
- distributed ordering
- duplicate detection

Do not introduce global ordering unless necessary.

Prefer ordering boundaries appropriate to the messaging domain.

---

# PHASE 14 — NOTIFICATIONS

## Lecture 40.44 — Notification Domain

Build the notification system independently from messaging business logic.

Events:

```text
mention
reply
reaction
server invitation
role change
message activity
```

Architecture:

```text
Message event
     ↓
Notification service
     ↓
Notification persistence
     ↓
delivery channels
```

---

# PHASE 15 — NOTIFICATION DELIVERY

## Lecture 40.45 — Notification Queue

Study asynchronous processing.

Possible infrastructure:

```text
Redis
BullMQ
```

BullMQ should only be introduced if the project chooses it for background jobs.

Status:

**Future tool candidate, not currently locked.**

Study:

- queues
- workers
- retries
- dead-letter handling
- backoff

---

# PHASE 16 — REDIS PRODUCTION ARCHITECTURE

## Lecture 40.46 — Redis Usage Strategy

Redis should not become a random global cache.

Define clear categories:

```text
Redis
├── rate limiting
├── presence
├── ephemeral state
├── cache
├── distributed coordination
└── queues
```

Every Redis key must have:

```text
namespace
purpose
TTL policy
ownership
```

Example current convention:

```text
ws:send-message:${userId}
```

Continue namespace-based key design.

---

# PHASE 17 — DATABASE PERFORMANCE

## Lecture 40.47 — PostgreSQL Index Strategy

Study:

- B-tree indexes
- composite indexes
- partial indexes
- unique indexes
- foreign-key indexes
- query planning

For 1M users, database design matters more than simply adding hardware.

---

# PHASE 18 — TRANSACTION DESIGN

## Lecture 40.48 — Transaction Boundaries

Define when a PostgreSQL transaction is required.

Use transactions for operations where multiple writes must succeed/fail together.

Do not wrap every query in a transaction unnecessarily.

Study:

- atomicity
- isolation
- deadlocks
- transaction duration
- retry strategy

---

# PHASE 19 — CQRS / COMMAND-QUERY SEPARATION

## Lecture 40.49 — Formalize Command/Query Architecture

Nexus already uses concepts such as:

```text
ChannelMessageCommandService
ChannelMessageQueryService
ChannelMessageReactionCommandService
ChannelMessageReactionQueryService
```

Formalize this architecture.

### Commands

Change state.

```text
create
update
delete
pin
react
```

### Queries

Read state.

```text
get message
get reactions
get counts
```

Benefits:

- clearer responsibilities
- easier optimization
- easier testing
- future read-model scaling

---

# PHASE 20 — REPOSITORY ARCHITECTURE

## Lecture 40.50 — Repository Boundary Hardening

Repositories own persistence operations.

Services own business logic.

Gateway owns transport concerns.

Correct:

```text
Gateway
   ↓
Service
   ↓
Repository
```

Avoid:

```text
Gateway
   ↓
Prisma
```

---

# PHASE 21 — MAPPER ARCHITECTURE

## Lecture 40.51 — Domain/Data Mapping

Introduce mappers where Prisma entities should not leak through the entire application.

Concept:

```text
Prisma model
     ↓
Mapper
     ↓
Application/domain representation
```

This is particularly important as API responses become more complex.

---

# PHASE 22 — SECURITY HARDENING

## Lecture 40.52 — WebSocket Security Review

Review:

- authentication
- authorization
- room authorization
- payload validation
- rate limiting
- replay protection
- injection
- information leakage
- enumeration
- abuse

---

# PHASE 23 — HTTP SECURITY HARDENING

## Lecture 40.53 — API Security Hardening

Review:

- JWT security
- refresh token rotation
- session invalidation
- RBAC
- permission checks
- CORS
- CSRF where applicable
- request limits
- input validation
- security headers

Exact implementation depends on existing authentication module.

---

# PHASE 24 — PRIVATE MESSAGING ARCHITECTURE

This is one of the major locked Nexus product directions.

Nexus messaging architecture is hybrid.

## Three major messaging models

```text
1. Cloud/community channels
2. Standard direct messages
3. Private E2EE messaging
```

Additionally:

```text
Secret Groups
```

are part of the planned messaging architecture.

---

# PHASE 25 — STANDARD DIRECT MESSAGES

## Lecture 40.54 — Direct Message Domain

> **Status: COMPLETED** — shipped as master Lecture **40.62** in `src/modules/direct-messages/` (models `DirectMessageChannel` / `DirectMessage` / `DirectMessageReadState`; canonical `orderPair` user-pair channels; `dm-command` / `dm-query` services; `/dm` gateway namespace with `dm-open|send|sync|read`; REST controller; `clientMessageId` dedupe; per-channel `messageSeq`; rooms `dm:${channelId}`).

Build cloud-backed direct messaging separately from channel messaging.

Study:

```text
Conversation
ConversationMember
DirectMessage
```

Exact schema:

**[UNKNOWN]**

Do not copy the channel schema blindly.

---

# PHASE 26 — END-TO-END ENCRYPTED MESSAGING

## Lecture 40.55 — E2EE Architecture Fundamentals

Nexus should use a **Signal-style architecture** for private E2EE messaging rather than inventing cryptography.

Study:

- identity keys
- prekeys
- signed prekeys
- session establishment
- ratcheting
- forward secrecy
- post-compromise security
- device identity
- key verification

The exact protocol/library version must be selected after technical evaluation.

Do not implement custom cryptographic primitives.

---

# PHASE 27 — DEVICE & KEY MANAGEMENT

## Lecture 40.56 — Multi-Device Identity

Private messaging requires device-level identity.

Concept:

```text
User
 ├── Device A
 │    └── cryptographic identity
 │
 ├── Device B
 │    └── cryptographic identity
 │
 └── Device C
      └── cryptographic identity
```

Study:

- device registration
- key rotation
- device revocation
- identity verification
- lost-device handling

---

# PHASE 28 — PREKEY SERVER

## Lecture 40.57 — Key Distribution Backend

The server should facilitate key discovery/distribution.

Important principle:

> The server should not possess plaintext private-message keys.

Study:

```text
identity public key
signed prekey
one-time prekeys
device metadata
```

Private keys remain on user devices.

Exact storage model:

**[UNKNOWN]**

---

# PHASE 29 — SIGNAL SESSION ESTABLISHMENT

## Lecture 40.58 — Session Establishment

Study the Signal-style flow:

```text
Device A
   ↓
fetch public key material
   ↓
establish session
   ↓
encrypted payload
   ↓
server
   ↓
Device B
   ↓
decrypt locally
```

Server sees ciphertext, not plaintext.

---

# PHASE 30 — DOUBLE RATCHET

## Lecture 40.59 — Ratcheting

Study:

- symmetric-key ratchet
- DH ratchet
- message keys
- skipped message keys
- session state

Do not implement cryptographic mathematics manually if a vetted protocol implementation is available.

---

# PHASE 31 — SECRET GROUPS

## Lecture 40.60 — E2EE Group Messaging

Extend private encryption architecture to groups.

Study:

- group membership
- sender keys / appropriate group protocol
- member addition
- member removal
- key rotation
- device changes

Exact cryptographic group protocol:

**[UNKNOWN]**

Must be decided before implementation.

---

# PHASE 32 — MESSAGE ENCRYPTION STORAGE

## Lecture 40.61 — Encrypted Message Persistence

Database stores encrypted payloads where required.

Concept:

```text
plaintext
   ↓
client encryption
   ↓
ciphertext
   ↓
PostgreSQL
```

Server-side message search becomes limited for E2EE content.

This is an intentional trade-off.

---

# PHASE 33 — E2EE ATTACHMENTS

## Lecture 40.62 — Encrypted Media

For private messaging:

```text
file
 ↓
client-side encryption
 ↓
object storage
 ↓
encrypted object
```

Storage options already discussed include:

- Cloudflare R2
- object storage

Exact production provider:

**[UNKNOWN]**

---

# PHASE 34 — E2EE METADATA MINIMIZATION

## Lecture 40.63 — Privacy Metadata

E2EE does not automatically hide metadata.

Study:

- sender
- recipient
- timestamps
- IP addresses
- device metadata
- message size
- delivery metadata

Define what Nexus actually promises.

Important:

> E2EE should not be advertised as making all metadata invisible unless the architecture actually provides that property.

---

# PHASE 35 — SEARCH ARCHITECTURE

## Lecture 40.64 — Message Search

Cloud messages can potentially support server-side search.

E2EE messages cannot be treated like ordinary plaintext search.

Therefore maintain two models:

```text
Cloud messages
    ↓
server-side search

E2EE messages
    ↓
client-side searchable representation
```

Exact search architecture:

**[UNKNOWN]**

---

# PHASE 36 — FILE / MEDIA PROCESSING

## Lecture 40.65 — Media Pipeline

Study:

```text
upload
 ↓
validation
 ↓
virus/security scanning
 ↓
object storage
 ↓
metadata
 ↓
CDN
```

Potential tools:

- Cloudflare R2
- MinIO for local development
- CDN

---

# PHASE 37 — ASYNCHRONOUS PROCESSING

## Lecture 40.66 — Background Jobs

Jobs may include:

```text
notifications
media processing
cleanup
email
push notifications
analytics
search indexing
```

Potential technology:

```text
BullMQ + Redis
```

but this is not currently a locked dependency.

---

# PHASE 38 — OBSERVABILITY

## Lecture 40.67 — Structured Logging

Current project already has logger infrastructure.

Production logging should include:

```text
requestId
userId where appropriate
module
operation
duration
error code
```

Never log:

```text
password
JWT
refresh token
E2EE plaintext
private key
secret
```

---

# PHASE 39 — DISTRIBUTED TRACING

## Lecture 40.68 — Tracing

Study:

```text
Gateway
 ↓
Service
 ↓
Repository
 ↓
PostgreSQL
```

and:

```text
Gateway
 ↓
Redis
```

Use OpenTelemetry if selected for production observability.

Technology status:

**Future candidate.**

---

# PHASE 40 — METRICS

## Lecture 40.69 — Production Metrics

Measure:

```text
WebSocket connections
active users
messages/sec
message latency
DB latency
Redis latency
rate-limit violations
errors
queue depth
notification latency
```

Possible technology:

```text
Prometheus
Grafana
```

Status:

**Future candidate.**

---

# PHASE 41 — LOAD TESTING

## Lecture 40.70 — 1M User Load Model

Do not test 1M users simply by starting 1M sockets on one machine.

Model:

```text
1M registered users
↓
concurrent users
↓
active WebSocket connections
↓
messages/sec
↓
database writes/sec
↓
Redis operations/sec
```

Exact target concurrency:

**[UNKNOWN]**

Must be defined using expected product usage.

---

# PHASE 42 — WEBSOCKET HORIZONTAL SCALING

## Lecture 40.71 — Multi-Instance WebSocket Architecture

> **Status: FOUNDATION IMPLEMENTED** — the Redis socket.io adapter was shipped as master Lecture **40.61** (`src/core/redis/redis-io.adapter.ts`, `RedisIoAdapter` extends stock `IoAdapter`). Full multi-instance rollout (connection affinity, per-instance room/emit routing, load-tested scale-out) remains a future phase.

Current:

```text
Client
 ↓
NestJS
```

Production:

```text
Clients
   ↓
Load Balancer
   ↓
┌───────────────┐
│ API instance 1│
│ API instance 2│
│ API instance 3│
│ API instance N│
└───────────────┘
       ↓
     Redis
```

Redis becomes important for cross-instance coordination.

Socket.IO adapter strategy must be selected during this phase.

---

# PHASE 43 — DATABASE SCALING

## Lecture 40.72 — PostgreSQL Scaling

Study:

- connection pooling
- read replicas
- partitioning
- vacuum
- indexes
- query optimization
- connection limits

Do not introduce database sharding prematurely.

---

# PHASE 44 — CACHE STRATEGY

## Lecture 40.73 — Cache Architecture

Determine:

```text
what is cached
why it is cached
TTL
invalidation
consistency
```

Do not cache everything.

Potential cache targets:

```text
server metadata
permissions
user profile summaries
hot channels
```

Exact cache policy:

**[UNKNOWN]**

---

# PHASE 45 — API VERSIONING

## Lecture 40.74 — API Evolution

Define:

```text
/api/v1
```

or equivalent versioning strategy before public production API stabilization.

Exact versioning convention:

**[UNKNOWN]**

---

# PHASE 46 — API CONTRACT DOCUMENTATION

## Lecture 40.75 — OpenAPI / Swagger Hardening

Existing backend has Swagger-related infrastructure.

Document:

- authentication
- users
- servers
- channels
- messages
- reactions
- notifications

WebSocket contracts should also have separately documented event definitions.

---

# PHASE 47 — CONTRACT TESTING

## Lecture 40.76 — API & WebSocket Contract Tests

Ensure that:

```text
DTO
response
error
event
```

remain compatible.

This becomes especially important once frontend development begins.

---

# PHASE 48 — INTEGRATION TESTING

## Lecture 40.77 — Database Integration Tests

Test against PostgreSQL rather than mocking everything.

Test:

```text
transaction
repository
constraint
authorization
message lifecycle
reaction lifecycle
```

---

# PHASE 49 — REDIS INTEGRATION TESTING

## Lecture 40.78 — Redis Integration Tests

Test:

```text
rate limit
presence
cache
queues
distributed coordination
```

Use isolated test Redis infrastructure.

---

# PHASE 50 — END-TO-END TESTING

## Lecture 40.79 — Messaging E2E Tests

Full flow:

```text
connect
 ↓
authenticate
 ↓
join channel
 ↓
send message
 ↓
database
 ↓
broadcast
 ↓
receive
 ↓
edit
 ↓
pin
 ↓
reaction
 ↓
delete
```

---

# PHASE 51 — FAILURE TESTING

## Lecture 40.80 — Failure Injection

Study failures:

```text
Redis unavailable
PostgreSQL unavailable
WebSocket instance unavailable
network interruption
duplicate request
slow database
queue failure
```

The objective is graceful degradation rather than perfect uptime assumptions.

---

# PHASE 52 — DEPLOYMENT ARCHITECTURE

## Lecture 40.81 — Production Deployment

Production topology concept:

```text
                    Internet
                       │
                    CDN / WAF
                       │
                Load Balancer
                       │
          ┌────────────┴────────────┐
          │                         │
       API #1                    API #2
          │                         │
          └────────────┬────────────┘
                       │
                  PostgreSQL
                       │
                     Redis
                       │
                Object Storage
```

Exact infrastructure provider:

**[UNKNOWN]**

---

# PHASE 53 — CONTAINERIZATION

## Lecture 40.82 — Production Docker

Create production containers separately from development containers.

Study:

- multi-stage builds
- minimal runtime image
- non-root user
- environment configuration
- health checks
- graceful shutdown

Never bake secrets into images.

---

# PHASE 54 — CI/CD

## Lecture 40.83 — Backend CI Pipeline

Pipeline:

```text
push
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build
 ↓
security checks
 ↓
container build
 ↓
deployment
```

CI provider:

**[UNKNOWN]**

---

# PHASE 55 — DATABASE MIGRATIONS

## Lecture 40.84 — Production Prisma Migration Strategy

Study:

- migration files
- migration ordering
- production migration
- rollback planning
- destructive migration safety

Never casually modify production schema manually.

---

# PHASE 56 — BACKUP & DISASTER RECOVERY

## Lecture 40.85 — PostgreSQL Backup

Define:

```text
backup frequency
retention
restore testing
point-in-time recovery
```

Exact policy:

**[UNKNOWN]**

A backup that has never been restored/tested should not be considered reliable.

---

# PHASE 57 — SECURITY AUDIT

## Lecture 40.86 — Backend Security Audit

Review the complete backend:

```text
authentication
authorization
validation
SQL
Redis
WebSockets
uploads
logging
secrets
dependencies
E2EE
```

Potential tooling:

- dependency scanners
- SAST
- container scanning
- OWASP testing tools

Exact tools:

**[UNKNOWN]**

---

# PHASE 58 — PERFORMANCE ENGINEERING

## Lecture 40.87 — Performance Profiling

Measure before optimizing.

Study:

```text
CPU
memory
event-loop latency
PostgreSQL
Redis
network
WebSocket throughput
```

Do not optimize based only on intuition.

---

# PHASE 59 — CAPACITY PLANNING

## Lecture 40.88 — 1M User Capacity Model

Create actual estimates for:

```text
registered users
daily active users
concurrent users
messages/user/day
messages/sec
database storage
media storage
Redis memory
network bandwidth
```

Exact numbers:

**[UNKNOWN]**

They must be established from expected product usage rather than guessed.

---

# PHASE 60 — PRODUCTION READINESS REVIEW

## Lecture 40.89 — Backend Production Readiness

Final checklist:

```text
Architecture
Database
Security
Authentication
Authorization
Messaging
E2EE
Redis
WebSockets
Notifications
Testing
Observability
CI/CD
Backups
Disaster recovery
Performance
Scaling
Documentation
```

---

# PHASE 61 — BACKEND FREEZE

## Lecture 40.90 — Backend Feature Freeze

Before frontend:

```text
freeze backend contracts
↓
stabilize APIs
↓
stabilize WebSocket events
↓
finalize DTOs
↓
finalize error codes
↓
finalize authentication
↓
finalize authorization
↓
finalize messaging contracts
```

Only bug fixes and production-hardening changes should happen after this point unless a critical architectural issue is discovered.

---

# 8. Frontend Start Condition

Frontend does **not** begin after Lecture 40.30.

Frontend begins only after the backend milestone is reached.

Required:

```text
Backend feature complete
        +
API contracts stable
        +
WebSocket contracts stable
        +
Authentication stable
        +
Authorization stable
        +
Messaging stable
        +
E2EE architecture stable
        +
Testing complete
        +
Production architecture validated
```

Then:

```text
                BACKEND
                   │
                   ▼
          API CONTRACT FREEZE
                   │
                   ▼
             FRONTEND START
```

---

# 9. Why Frontend Is Delayed

If frontend starts too early:

```text
backend changes
     ↓
API changes
     ↓
frontend rewrites
     ↓
duplicated work
```

Instead:

```text
backend domain
      ↓
API
      ↓
WebSocket events
      ↓
stable contracts
      ↓
frontend implementation
```

This is particularly important because Nexus has a large messaging system.

---

# 10. Production-Grade Tool Strategy

## PostgreSQL

Use for durable relational state.

Use indexes and transactions carefully.

---

## Prisma

Use for:

- standard CRUD
- relations
- transactions
- migrations
- typed database access

Use SQL/query objects where complex graph/query performance requires it.

This follows the existing hybrid Prisma + SQL direction.

---

## Redis

Use for:

- rate limiting
- presence
- ephemeral state
- caching
- distributed coordination
- queues where selected

Never use Redis as the primary source of durable message history.

---

## Socket.IO

Use for:

- realtime events
- channel room membership
- message events
- reactions
- presence
- realtime notifications

For horizontal scaling, introduce an appropriate distributed Socket.IO adapter.

---

## Cloudflare R2 / Object Storage

Use object storage for media rather than PostgreSQL blobs.

Local development may continue using MinIO.

---

## BullMQ

Potential future tool for:

```text
background jobs
notifications
media processing
cleanup
```

Not currently a locked dependency.

---

## OpenTelemetry

Potential production observability technology for:

```text
traces
service boundaries
database timing
Redis timing
request correlation
```

Not currently locked.

---

## Prometheus / Grafana

Potential metrics stack.

Not currently locked.

---

# 11. Low-Level Design Rules

## Rule 1 — Gateway does not own business logic

Bad:

```text
Gateway
 ↓
Prisma
```

Correct:

```text
Gateway
 ↓
Command Service
 ↓
Repository
 ↓
Prisma
```

---

## Rule 2 — Query and command separation

Commands mutate.

Queries read.

Do not put mutation logic inside query services.

---

## Rule 3 — Repository owns persistence

Repository handles:

```text
create
find
update
delete
```

but should not decide business permissions.

---

## Rule 4 — Authorization remains server-side

Never trust:

```text
userId
serverId
role
permission
```

from client payloads when they can be derived from authenticated context.

---

## Rule 5 — Validate before expensive work

Preferred:

```text
authentication
 ↓
DTO validation
 ↓
rate limit
 ↓
authorization
 ↓
business validation
 ↓
database
```

---

## Rule 6 — Broadcast only after successful persistence

Correct:

```text
database transaction
      ↓
success
      ↓
broadcast
```

Never broadcast a message before the database operation succeeds.

---

## Rule 7 — Room membership is not authorization by itself

Joining a Socket.IO room must be preceded by channel access validation.

Existing flow:

```text
validateChannelAccess()
        ↓
client.join(channelId)
```

Maintain this rule.

---

## Rule 8 — Do not leak database models unnecessarily

Use DTOs/mappers where required.

---

# 12. Security Model

Nexus security should use defense in depth.

```text
                Authentication
                       ↓
                 DTO validation
                       ↓
                 Rate limiting
                       ↓
                 Authorization
                       ↓
                 Business rules
                       ↓
                Database constraints
                       ↓
                   Logging
                       ↓
                 Monitoring
```

No single layer should be treated as sufficient.

---

# 13. 1M User Scaling Strategy

The target is not:

> "Make every request distributed immediately."

The target is:

> Build a modular backend that can evolve into a distributed architecture when measured load requires it.

Initial:

```text
NestJS
PostgreSQL
Redis
Object Storage
```

Then scale horizontally:

```text
API #1
API #2
API #3
...
```

with:

```text
Load Balancer
Redis
PostgreSQL
Object Storage
```

Then optimize specific bottlenecks.

Potential future scaling boundaries:

```text
Messaging
Notifications
Media processing
Search
Realtime
```

should be candidates for extraction only when actual operational requirements justify it.

---

# 14. Development Strategy Per Lecture

Every lecture should follow this process.

## Step 1 — Understand

Explain:

```text
what
why
where
when
```

## Step 2 — Architecture

Show:

```text
current architecture
       ↓
new component
       ↓
data flow
```

## Step 3 — Low-Level Design

Define:

```text
classes
methods
DTOs
interfaces
repositories
database changes
events
```

## Step 4 — Implementation

Implement the smallest coherent change.

## Step 5 — Compile

Run:

```text
pnpm start:dev
```

or the project's established equivalent.

## Step 6 — Test

Run the relevant tests.

## Step 7 — Security Review

Check:

```text
authentication
authorization
validation
rate limiting
data leakage
```

## Step 8 — Commit

Use a meaningful conventional commit.

Example:

```text
feat(messages): add cursor pagination
```

---

# 15. Lecture Completion Standard

A lecture is not complete merely because TypeScript compiles.

Definition:

```text
Code
 +
Architecture
 +
Validation
 +
Authorization
 +
Tests
 +
Error handling
 +
Security review
 +
Documentation
 +
Git commit
```

must be completed where applicable.

---

# 16. Important New Concepts To Learn

During the future roadmap, the following concepts should be explicitly taught rather than blindly implemented.

## Backend architecture

- modular monolith
- domain boundaries
- CQRS
- repository pattern
- mapper pattern
- dependency injection
- transactions

## PostgreSQL

- indexing
- composite indexes
- query plans
- transactions
- isolation
- locking
- connection pooling
- partitioning
- replication

## Redis

- TTL
- atomic operations
- rate limiting
- distributed coordination
- cache invalidation
- pub/sub
- queues
- distributed locks where justified

## WebSockets

- lifecycle
- room architecture
- authentication
- authorization
- reconnect
- ordering
- acknowledgements
- event replay
- horizontal scaling

## Distributed systems

- idempotency
- eventual consistency
- outbox pattern
- retries
- backoff
- duplicate events
- event ordering
- failure handling

## Security

- RBAC
- session invalidation
- rate limiting
- abuse prevention
- replay attacks
- metadata leakage
- secure secret management
- cryptographic key management

## E2EE

- public/private keys
- identity keys
- prekeys
- signed prekeys
- session establishment
- forward secrecy
- ratchets
- multi-device identity
- group encryption
- key rotation

## Production

- observability
- tracing
- metrics
- capacity planning
- load testing
- disaster recovery
- CI/CD
- container hardening
- health checks

---

# 17. What Must Never Be Done

Do not:

- invent cryptography
- put private E2EE keys on the server
- trust client-provided authorization information
- bypass services and call Prisma from gateways
- put business logic into DTOs
- use Redis as permanent message storage
- broadcast before database persistence
- introduce microservices just for the sake of scalability
- introduce technologies without a concrete requirement
- expose secrets in logs
- log plaintext E2EE messages
- commit `.env` values
- change locked architecture without discussion

---

# 18. Current Point

## Current messaging milestone

```text
40.62 — Direct Message Domain (Type B — standard, non-E2EE DMs)   (completed)
40.63 — Private E2EE Messaging Foundation                         (completed)
40.64 — E2EE Device and Key Management                            (completed)
40.65 — Key Distribution Backend                                  (completed)
40.66 — Session Establishment                                     (completed)
40.67 — Double Ratchet                                            (completed)
40.68 — E2EE Message Transport                                    (completed)
40.69 — E2EE Multi-Device / Key Rotation / Safety Verification    (completed)
40.70 — Secret Groups / E2EE Group Messaging                      (completed)
40.71 — E2EE Attachments                                          (completed)
40.73 — E2EE Metadata Minimization                                (completed)
40.74 — Message Search — Part 2 (MeiliSearch)                     (completed)
40.75 — Media Pipeline — Part 2 (BullMQ)                          (completed)
40.76 — Background Jobs (BullMQ full set)                         (completed)
40.77 — Structured Logging                                        (completed)
40.78 — Distributed Tracing                                       (completed)
40.79 — Production Metrics                                        (completed)
40.80 — Scale, Performance, Testing, Production (1M-User Load Model)  (completed)
40.81 — Multi-Instance WebSocket Scaling (node registry + adapter hardening)  (completed)
40.82 — (Load-model-driven DB/query optimisation, next Scale-phase step)  (current)
```

The backend now contains everything listed in the original milestone plus all subsequent shipped work:

```text
authentication guard
gateway-wide validation pipe
exception filter
rate limiting
message commands
message queries
reaction commands
reaction queries
room-based broadcasting
cursor pagination & history queries (REST + WS)
read/unread state
typing indicators
Redis-backed presence
reconnect / missed-event sync (sync-channel replay)
idempotent message sending (clientMessageId dedupe)
media/attachment upload backend
mentions
message search part 1
transactional outbox + dispatcher
negative/security WebSocket tests
CQRS repositories/services + mapper boundary
Redis usage strategy + WS connection limits
Redis socket.io adapter (cross-instance broadcast foundation)
Direct Message Domain (canonical pair channels, /dm namespace, DM + REST)
E2EE series (40.63–40.73: foundation, device/key mgmt, key dist, session, ratchet, transport, multi-device, groups, attachments, metadata minimization)
Message Search Part 2 (MeiliSearch, BM25 ranking) (`src/modules/search/`)
Media Pipeline Part 2 (BullMQ AV scan/thumbnails/transcoding) (`src/modules/media/`)
Background Jobs (BullMQ full set) (`src/modules/jobs/`)
```

The uploaded gateways confirm both the `/messages` namespace and the `/dm` namespace, along with the channel/DM message, reaction, sync, and read events.

---

# 19. Immediate Roadmap

The immediate sequence toward direct messaging + E2EE is now:

```text
40.62
Direct Message Domain (Type B)   (completed)
        ↓
40.63
Private E2EE Messaging Foundation (completed)
        ↓
40.64
E2EE Device and Key Management   (completed)
        ↓
40.65
Key Distribution Backend   (completed)
        ↓
40.66
Session Establishment   (completed)
        ↓
40.67
Double Ratchet   (completed)
        ↓
40.68
E2EE Message Transport (completed)
        ↓
40.69
Multi-Device / Key Rotation / Safety Verification (completed)
        ↓
40.70
Secret Groups / E2EE Group Messaging (completed)
        ↓
40.71
E2EE Attachments (completed)
        ↓
40.73
E2EE Metadata Minimization (completed)
        ↓
40.74
Message Search — Part 2 (completed)
        ↓
40.75
Media Pipeline — Part 2 (completed)
        ↓
40.76
Background Jobs (BullMQ full set) (completed)
        ↓
40.77
Structured Logging (completed)
        ↓
40.78
Distributed Tracing (completed)
        ↓
40.79
Production Metrics (completed)
        ↓
40.80
Scale, Performance, Testing, Production (1M-User Load Model) (completed)
        ↓
40.81
Multi-Instance WebSocket Scaling — node registry + adapter hardening (completed)
        ↓
40.82
Load-model-driven DB/query optimisation, next Scale-phase step [NEXT/CURRENT]
```

Continue through the scale/perf/testing/production phases (40.80 onward) defined above — re-run `scripts/load/load-baseline.mjs` after each 40.82+ optimisation to confirm improvement against the 40.80 baseline.

The earlier immediate sequence (40.28.9 → 40.30 connection lifecycle, 40.31 pagination, 40.32 query optimization → 40.35 delete semantics) has been **superseded by the merged master roadmap in `PROJECT_DETAIL.md` and is fully implemented in renumbered form (40.40-40.62 completed).**

---

# 20. Backend Completion Gate

The backend should not be declared complete until:

```text
[x] Authentication complete
[x] Authorization complete
[x] Users complete
[x] Social graph complete
[x] Organizations complete
[x] Servers complete
[x] Channels complete
[x] Cloud messaging complete
[x] Direct messaging complete
[ ] Private E2EE architecture complete  (current phase — 40.67+)
[ ] Secret groups complete
[ ] Notifications complete
[~] Redis architecture complete        (usage strategy + adapter foundation done; remaining Redis work pending)
[~] WebSocket scaling complete          (Redis adapter foundation done at 40.61)
[ ] Database optimization complete
[ ] Security hardening complete         (foundation done at 40.54; ongoing review remains)
[ ] Integration tests complete
[ ] E2E tests complete
[ ] Load tests complete
[ ] Observability complete
[ ] CI/CD complete
[ ] Backup/recovery complete
[ ] API contracts stable
[ ] WebSocket contracts stable
[ ] Production deployment validated
```

Only then:

```text
                    BACKEND COMPLETE
                           ↓
                   CONTRACT FREEZE
                           ↓
                    FRONTEND START
```

---

# 21. Guiding Principle

The Nexus backend should evolve in this direction:

```text
                    DOMAIN
                      │
                      ▼
                MODULAR MONOLITH
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
       PostgreSQL               Redis
          │                       │
          │                       ├── ephemeral state
          │                       ├── rate limiting
          │                       ├── presence
          │                       └── distributed coordination
          │
          ▼
       Durable state
          │
          ▼
      NestJS Services
          │
      ┌───┴────┐
      ▼        ▼
  Commands   Queries
      │        │
      └───┬────┘
          ▼
     WebSocket/API
          │
          ▼
       Clients
```

For private messaging:

```text
Client
  │
  ├── cryptographic identity
  ├── private keys
  └── encryption/decryption
          │
          ▼
       Ciphertext
          │
          ▼
       Nexus Backend
          │
          ├── routing
          ├── delivery
          ├── encrypted storage
          └── key-discovery infrastructure
          │
          ▼
       Recipient
```

The backend should facilitate secure communication without becoming the holder of users' private E2EE keys.

---

# 22. Final Engineering Rule

The roadmap should be treated as the **implementation guide**, but not as permission to blindly implement every future technology.

For every future technology:

```text
Requirement
    ↓
Problem
    ↓
Scale/measurement
    ↓
Architecture decision
    ↓
Technology selection
    ↓
Implementation
    ↓
Benchmark
    ↓
Production validation
```

If a technology is marked `[UNKNOWN]`, it remains undecided until the relevant architecture phase.

**Never convert a future candidate into a locked dependency without an explicit architecture decision.**