# Nexus — PROJECT_FUTURE_BACKEND_IMPLEMENTATION

> **Purpose:** Master backend implementation roadmap for Nexus. This document preserves the architecture, implementation strategy, lecture flow, technology decisions, security model, messaging/privacy strategy, production tooling, testing strategy, frontend start gate, and future concepts so development can continue without losing context.

> **Status (synced with `PROJECT_DETAIL.md`, the live master roadmap):** The Messaging/Realtime 40.x series through **Lecture 40.81 - Multi-Instance WebSocket Scaling is IMPLEMENTED and COMPLETED**, advancing the Scale phase (40.80–40.100). This includes cursor pagination/history, read & unread state, typing, presence, idempotent sending, reconnect/missed-event sync, per-channel ordering, the transactional outbox, attachments, mentions, search part 1 & part 2 (MeiliSearch), media pipeline part 2 (BullMQ AV scan/thumbnails/transcoding), repository/CQRS/mapping hardening, security hardening, Redis usage/connection-limit drafting, the **Redis adapter for cross-instance broadcast** (B2 40.40/v1 40.40 distribution, done at 40.61), **Structured Logging** (B2 40.67), **Distributed Tracing** (B2 40.68), **Production Metrics** (B2 40.69), **1M-User Load Model** (B2 40.70), and **Multi-Instance WebSocket Scaling** (B2 40.71). **Current lecture: 40.91 (Production Deployment Architecture, next Scale-phase step)** (B2 40.81). **Completed: 40.90 Failure Injection Testing** `src/testing/failure/` + `test/websocket-unavailable.fail-inj.spec.ts` (opt-in failure-injection harness + `npm run test:failures`; six `.fail-inj` suites proving graceful degradation across the study list — Redis unavailable / PostgreSQL unavailable / WebSocket instance unavailable / network interruption / duplicate request / slow database / queue failure — against dead ports, `$extends` latency injection, the real unique constraint, a faked BullMQ layer, and a transport-level dead WS instance; also fixed a real `RedisService` hang — node-redis retried the initial connect forever and its offline queue buffered runtime commands indefinitely) (default suite 98 / 633 green; `test:failures` 6 / 23 green; `test:redis` 5 / 25 green; `test:e2e` 1 / 7 green). **Completed: 40.89 Messaging E2E Tests** `test/` (opt-in real-app harness + `npm run test:e2e`; HTTP messaging pipeline E2E over a real Postgres schema + Redis) (default suite 98 / 633 green; `test:db` 6 / 19 green; `test:redis` 5 / 25 green; `test:e2e` 1 / 7 green). **Completed: 40.88 Redis Integration Tests** `src/testing/redis/` (opt-in real-Redis harness + `npm run test:redis`; five `.red-is` suites over rate limit/presence/cache/BullMQ queues/distributed coordination) (default suite 98 / 633 green; `test:redis` 5 / 25 green). See the progress table in `PROJECT_DETAIL.md` for the authoritative (completed)/(current) markers; the exact file layout is `src/modules/direct-messages/` + `src/core/redis/redis-io.adapter.ts` + E2EE modules + `src/modules/search/`, `src/modules/media/`, `src/modules/jobs/` + `src/core/logger/` + `src/core/tracing/` + `src/core/metrics/` + `src/core/load-model/` + `src/core/redis/redis-node-registry.ts` + `src/core/db/query-optimizer/`.

---

# 1. Executive Direction

Nexus is being built as a **production-grade next-generation social/collaboration network**, not as a simple CRUD application.

The backend is intentionally developed before the main frontend so that the frontend eventually consumes stable:

- authentication contracts
- authorization contracts
- user/identity contracts
- server/channel contracts
- messaging contracts
- realtime events
- pagination contracts
- notification contracts
- media contracts
- privacy/security contracts

The development philosophy is:

```text
First Principles
      ↓
Architecture
      ↓
Decision
      ↓
Folder/File Design
      ↓
Implementation
      ↓
Compile
      ↓
Run
      ↓
Swagger/API Test
      ↓
Automated Tests
      ↓
Security Review
      ↓
Performance Review
      ↓
Git Commit
```

---

# 2. Locked Technology Stack

## Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO
- Redis
- Passport
- JWT
- Argon2id
- Swagger/OpenAPI
- Pino structured logging

## Infrastructure

- Docker
- Docker Compose for local development
- PostgreSQL
- Redis
- MinIO locally for S3-compatible object-storage development
- Cloudflare R2 for production object storage
- Cloudflare CDN
- CI/CD
- VPS/cloud deployment

## Future observability

- OpenTelemetry
- Prometheus
- Grafana
- Loki or managed log aggregation
- Sentry or equivalent application error tracking

## Frontend

After backend vertical-slice completion:

- Next.js
- React
- TypeScript
- WebSocket/Socket.IO client

## Mobile

Later:

- React Native

---

# 3. Repository Architecture

```text
nexus/
├── apps/
│   ├── api/                 # NestJS backend
│   ├── web/                 # Next.js web
│   ├── mobile/              # React Native, later
│   ├── admin/               # Admin application, later
│   └── docs/                # Documentation
│
├── packages/
│   ├── types/
│   ├── contracts/
│   ├── config/
│   ├── ui/
│   └── utils/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── deployment/
│
├── pnpm-workspace.yaml
└── PROJECT_FUTURE_BACKEND_IMPLEMENTATION.md
```

---

# 4. Backend Folder Architecture

Current architectural preference:

```text
apps/api/src/
├── app.module.ts
├── main.ts
│
├── common/
│   ├── decorators/
│   ├── dto/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── middleware/
│   ├── exceptions/
│   ├── constants/
│   ├── types/
│   └── utils/
│
├── config/
│
├── core/
│   ├── database/
│   ├── logger/
│   ├── redis/
│   ├── security/
│   ├── observability/
│   └── storage/
│
└── modules/
    ├── auth/
    ├── users/
    ├── social/
    ├── servers/
    ├── feeds/
    ├── messages/
    ├── notifications/
    ├── media/
    ├── search/
    ├── moderation/
    └── ...
```

### Architectural rule

Reusable infrastructure belongs in `core` or `common`.

Business behavior belongs in `modules`.

Examples:

```text
core/database
core/redis
common/interceptors
common/guards
common/filters
```

versus:

```text
modules/messages
modules/servers
modules/users
```

---

# 5. Domain-First Module Structure

Business modules should normally follow:

```text
modules/messages/
├── controllers/
├── gateways/
├── dto/
├── services/
├── repositories/
├── queries/
├── mappers/
├── types/
├── constants/
├── exceptions/
└── messages.module.ts
```

For larger modules:

```text
modules/messages/
├── channel/
├── direct/
├── reactions/
├── attachments/
├── encryption/
└── ...
```

Do not prematurely create dozens of empty folders. Add structure when a domain concept becomes real.

---

# 6. Data Access Strategy

Nexus uses a **hybrid data-access strategy**.

## Prisma

Use Prisma for:

- normal CRUD
- transactions
- simple relational access
- standard repositories
- migrations/schema management

## SQL

Use SQL/query objects for:

- social graph traversal
- complex feed queries
- ranking
- high-performance joins
- aggregation-heavy queries
- carefully optimized read paths

## Repository rule

Business services should not directly contain large Prisma queries.

Preferred:

```text
Controller/Gateway
      ↓
Command/Query Service
      ↓
Repository / Query Object
      ↓
Prisma / SQL
      ↓
PostgreSQL
```

---

# 7. Command / Query Separation

For important domains:

```text
CommandService
    ↓
writes / mutations

QueryService
    ↓
reads / projections
```

Example:

```text
ChannelMessageCommandService
ChannelMessageQueryService
```

This improves:

- testing
- performance optimization
- readability
- future CQRS evolution
- read-model design

This does not mean Nexus must immediately become full event-sourced CQRS.

---

# 8. Mapping Strategy

Repositories return persistence-oriented data.

Services should map data into application-facing shapes when necessary.

Future pattern:

```text
Prisma Model
    ↓
Repository
    ↓
Mapper
    ↓
Application DTO / Domain Shape
```

This prevents Prisma schema details from leaking everywhere.

---

# 9. Global Infrastructure

## Configuration

Use:

```text
.env.development
.env.test
.env.production
```

Never commit secrets.

Configuration should be validated at startup.

Important categories:

```text
database
redis
jwt
cookies
cors
storage
email
rate limiting
encryption
observability
```

---

# 10. Authentication Architecture

Nexus authentication uses:

```text
User
  ↓
Authentication
  ↓
Session
  ↓
Access Token
  ↓
Refresh Token
```

The system must support server-side invalidation.

## JWT

Auth module owns JWT configuration.

Example architecture:

```text
AuthModule
├── JwtModule.registerAsync(...)
├── AuthService
├── AuthController
├── AuthGuard
├── SessionService
└── ...
```

The JWT module is not copied into every business module.

If a WebSocket guard needs `JwtService`, the correct solution is to make the module containing `JwtService` export it and import that module where needed, or use a dedicated security/auth infrastructure module.

Do not duplicate JWT registration unnecessarily.

---

# 11. Password Security

Production target:

- Argon2id
- password hashing
- password verification
- password reset
- account recovery
- rate limiting
- credential abuse detection

Never store plaintext passwords.

---

# 12. Session Security

Sessions should support:

- logout
- global logout
- token rotation
- refresh-token rotation
- refresh-token reuse detection
- session revocation
- device/session listing
- suspicious session detection

Future session model:

```text
User
 └── Sessions
      ├── device
      ├── createdAt
      ├── lastUsedAt
      ├── revokedAt
      └── token metadata
```

---

# 13. Authorization Architecture

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to do this?

Nexus uses:

```text
Authentication
      ↓
Membership
      ↓
Role
      ↓
Permission
      ↓
Resource-specific authorization
```

Example:

```text
User
 ↓
ServerMember
 ↓
Role
 ↓
ServerPermission
 ↓
MANAGE_MESSAGES
```

---

# 14. Permission-Service Contract

Current important method:

```ts
async hasPermission(
  serverId: string,
  userId: string,
  permission: ServerPermission,
  channelId?: string,
): Promise<boolean> {
  const permissions = await this.getPermissions(
    serverId,
    userId,
    channelId,
  );

  return permissions.has(permission);
}
```

**Argument order is locked:**

```text
serverId
userId
permission
channelId?
```

Do not accidentally call:

```text
serverId
permission
userId
```

This was the cause of repeated TypeScript errors during message authorization implementation.

---

# 15. Servers Architecture

Servers are the primary collaboration unit.

A server contains:

```text
Server
├── Members
├── Roles
├── Permissions
├── Categories
├── Channels
├── Invites
├── Announcements
├── Events
└── Threads
```

Future:

```text
Voice
Live
Screen Sharing
Bots
Integrations
```

---

# 16. Server Membership

Membership is a first-class relationship.

Authorization should normally verify:

```text
user → server membership → role/permissions
```

Do not assume a user has server access merely because the user exists.

---

# 17. Channel Architecture

Channels belong to servers.

Possible future channel types:

```text
TEXT
ANNOUNCEMENT
THREAD
MEDIA
VOICE
STAGE
```

Current message work focuses on text channels.

---

# 18. Messaging Architecture — Locked Decision

Nexus uses a **hybrid messaging model**.

## Type A — Server / Community Channels

Cloud-backed.

Purpose:

- communities
- servers
- collaboration
- announcements
- searchable history
- moderation
- server-level permissions

Messages are stored server-side.

---

## Type B — Standard Direct Messages

Cloud-backed.

Purpose:

- normal social messaging
- multi-device synchronization
- moderation/reporting where appropriate
- message history

---

## Type C — Private E2EE Direct Messages

Signal-style E2EE.

Purpose:

- private conversations
- strong privacy
- server cannot read plaintext

Architecture:

```text
Sender Device
    ↓
Signal Protocol
    ↓
Ciphertext
    ↓
Server
    ↓
Ciphertext
    ↓
Recipient Device
    ↓
Signal Protocol
    ↓
Plaintext
```

Server never receives the private plaintext message.

---

## Type D — Secret Groups

Signal-style E2EE group messaging.

The server stores:

- encrypted payload
- routing metadata
- delivery metadata
- minimal necessary identifiers

The server does not receive:

- plaintext private message
- private encryption keys
- decrypted message history

---

# 19. Signal-Style Messaging Decision

Nexus should **not invent its own cryptographic protocol**.

Use an established Signal Protocol implementation/library appropriate for the target platforms.

Concepts to learn before implementation:

- X3DH / modern session-establishment concepts
- identity keys
- signed prekeys
- one-time prekeys
- ratcheting
- Double Ratchet
- session state
- forward secrecy
- post-compromise security
- multi-device identity
- device keys
- group encryption architecture
- key backup/recovery tradeoffs

The implementation must be audited and library-driven.

---

# 20. Important E2EE Limitation

E2EE does not make a user invisible.

Even if plaintext is encrypted, a server may still know some metadata such as:

- account
- connection timing
- IP address
- message routing information
- approximate message size
- delivery timestamps
- device identifiers

Nexus should therefore distinguish:

```text
Content Privacy
vs
Metadata Privacy
```

Future privacy work should address both separately.

---

# 21. Telegram vs Signal Strategy

Nexus should study both but not blindly copy either.

## Signal-style strengths

- strong E2EE
- forward secrecy
- privacy-first architecture
- open cryptographic protocol principles

## Telegram-style strengths

- cloud synchronization
- large-scale messaging
- channels
- large groups
- media infrastructure

Nexus combines the useful product ideas while keeping a clear distinction:

```text
Cloud Collaboration
        +
Private E2EE Messaging
```

Do not pretend cloud-backed server channels are E2EE if the server can decrypt them.

---

# 22. Current Messaging Progress

The messaging module has reached the realtime channel-message/reaction stage.

Completed/implemented concepts include:

- channel message creation
- message query service
- message command service
- message validation
- channel authorization
- WebSocket gateway
- JWT WebSocket authentication
- WebSocket channel authorization
- send-message event
- update/edit event
- delete event
- pin event
- unpin event
- room-based delivery foundation
- message reactions
- reaction command service
- reaction query service
- reaction WebSocket events
- reaction broadcasting
- WebSocket error contract + exception filter (40.29 equivalent)
- connection auth guard + connection-rate limiting (40.30 equivalent)
- cursor pagination / message history REST + WS queries (40.23/40.24 equivalent)
- read state + per-channel read/unread tracking (40.25 equivalent)
- typing indicators (40.26 equivalent)
- presence (online/idle/offline/dnd/invisible via Redis) (40.27 equivalent)
- reconnect / missed-event sync (`sync-channel` replay with cursor gap detection) (40.29 equivalent)
- idempotent message sending (`clientMessageId` dedupe) (40.30 equivalent)
- media/attachment upload backend (signed URLs, MIME/size validation) (40.31 equivalent)
- mentions (40.33 equivalent)
- message search part 1 (Postgres `tsvector` + GIN, keyset cursor) (40.34 equivalent)
- transactional outbox + polling dispatcher (40.36 equivalent)
- messaging test suite + negative/security WS tests (40.37 equivalent)
- messaging security hardening (40.39 equivalent)
- formalized CQRS repositories/services + mapper boundary (B2 40.49/40.50/40.51)
- Redis usage strategy + WS connection limits (B2 40.46)
- **Redis adapter for cross-instance broadcast** (v1 40.40 / B2 40.40 distribution half)
- **Direct Message Domain (Type B — standard, non-E2EE DMs)** — `src/modules/direct-messages/`, `/dm` namespace, REST + WS, canonical user-pair channels, `messageSeq` ordering, `clientMessageId` dedupe, rooms `dm:${channelId}`

This progress is current as of **Lecture 40.67 (completed)**; the messaging/private-messaging roadmap continues from **40.68 — E2EE Message Transport**.

---

# 23. WebSocket Architecture

Current gateway:

```text
src/modules/messages/gateways/channel-message.gateway.ts
```

Namespace:

```text
/messages
```

Transport:

```text
Socket.IO
```

Rooms:

```text
channelId
```

Basic flow:

```text
Client connects
    ↓
JWT authentication
    ↓
client.data.userId
    ↓
join-channel
    ↓
validate channel membership/permission
    ↓
Socket.IO room
    ↓
message event
    ↓
broadcast to room
```

---

# 24. WebSocket Security

Never trust:

```ts
@MessageBody()
```

as authorization.

Client input is untrusted.

For each sensitive event:

```text
Authentication
    ↓
Input validation
    ↓
Resource lookup
    ↓
Membership validation
    ↓
Permission validation
    ↓
Command service
    ↓
Broadcast
```

---

# 25. WebSocket JWT Guard

The WebSocket guard must authenticate the socket and establish:

```ts
client.data.userId
```

The gateway can then use:

```ts
const userId = client.data.userId;
```

Do not accept userId from request payload when the authenticated socket already provides identity.

Bad:

```ts
request.userId
```

Preferred:

```ts
client.data.userId
```

---

# 26. Gateway Responsibility

Gateway should coordinate transport.

It should NOT become the business-logic container.

Preferred:

```text
Gateway
  ↓
CommandService
  ↓
Validation
  ↓
Repository
```

The gateway should handle:

- socket input
- authentication context
- transport errors
- room joins/leaves
- event names
- broadcasting

Business rules belong in services.

---

# 27. Important Gateway Mistake to Avoid

Do not inject the gateway into itself.

Wrong:

```ts
this.gateway.broadcastMessageCreated(...)
```

inside:

```text
ChannelMessageGateway
```

The gateway itself owns:

```ts
this.broadcastMessageCreated(...)
```

If a command service needs to notify realtime clients, use a separate event/broadcast abstraction or carefully controlled gateway integration.

Avoid circular dependency where possible.

---

# 28. Current Channel Message Events

Current event direction:

```text
join-channel
leave-channel

send-message
update-message
delete-message

pin-message
unpin-message

add-reaction
remove-reaction
```

Broadcast events:

```text
message-created
message-updated
message-deleted
message-pinned
message-unpinned

reaction-added
reaction-removed
```

---

# 29. Reaction Architecture

Reaction persistence:

```text
ChannelMessageReaction
```

Conceptually:

```text
ChannelMessage
    ↓
ChannelMessageReaction
    ↓
ServerMember
    ↓
User
```

A reaction belongs to a member in the server context, not directly to a random user field.

This is why the Prisma unique key became:

```text
messageId_memberId_emoji
```

instead of:

```text
messageId_userId_emoji
```

The schema is the source of truth.

---

# 30. Reaction Services

Expected structure:

```text
src/modules/messages/
├── repositories/
│   └── channel-message-reaction.repository.ts
│
├── services/
│   ├── channel-message-reaction-command.service.ts
│   └── channel-message-reaction-query.service.ts
│
└── gateways/
    └── channel-message.gateway.ts
```

Command service:

```text
addReaction
removeReaction
```

Query service:

```text
findReaction
findMessageReactions
```

---

# 31. Prisma Relationship Rule

When Prisma reports:

```text
missing opposite relation field
```

do not patch TypeScript first.

Fix the schema relationship.

For every relation, explicitly verify both sides.

Example:

```prisma
model User {
  messageReactions ChannelMessageReaction[]
}

model ChannelMessageReaction {
  member ServerMember @relation(...)
}
```

If the relation is conceptually through `ServerMember`, do not create a fake `userId` merely to silence TypeScript.

---

# 32. Lecture Workflow

Every lecture should follow this format:

## Part 1 — Concept

Explain the problem in simple terms.

## Part 2 — First Principles

Explain why the architecture exists.

## Part 3 — Nexus Decision

State the selected architecture.

## Part 4 — Folder/File

Show exact path.

Example:

```text
src/modules/messages/services/channel-message-reaction-query.service.ts
```

## Part 5 — Implementation

Give code in normal code snippets.

## Part 6 — Integration

Explain which existing services/modules change.

## Part 7 — Compile

Run:

```bash
pnpm start:dev
```

Expected:

```text
Found 0 errors.
```

## Part 8 — Runtime

Confirm Nest starts without dependency errors.

## Part 9 — Test

Swagger / WebSocket client / Postman / automated tests.

## Part 10 — Git

Commit only after the feature is stable.

---

# 33. Git Strategy

Use one meaningful commit per completed architectural lecture/feature.

Example:

```bash
git add .
git commit -m "feat(messages): add reaction query service"
```

Examples:

```text
feat(auth): implement jwt authentication
feat(messages): add channel message gateway
feat(messages): secure websocket channel access
feat(messages): add send-message websocket event
feat(messages): add message update event
feat(messages): add message delete event
feat(messages): add message pin events
feat(messages): add message reactions
feat(messages): add reaction query service
feat(messages): broadcast reaction events
```

Avoid:

```text
update
changes
fix stuff
test
```

---

# 34. Testing Strategy

Testing must progressively move from manual to automated.

## Unit Tests

Test:

- validation services
- permission services
- command services
- query services
- mappers

## Integration Tests

Test:

- PostgreSQL
- repositories
- Prisma transactions
- authorization
- module boundaries

## E2E Tests

Test:

```text
HTTP login
    ↓
JWT/session
    ↓
WebSocket connect
    ↓
join channel
    ↓
send message
    ↓
broadcast
```

## Realtime Tests

Test:

- unauthorized socket
- authorized socket
- unauthorized channel
- join/leave
- multiple clients
- message broadcast
- reaction broadcast
- disconnect

---

# 35. PHASE 3 — User / Identity Module

## Concepts

- global identity
- username
- profile
- profile privacy
- account state
- user settings
- device identity
- security settings

Architecture:

```text
User
├── Profile
├── Sessions
├── Devices
├── PrivacySettings
└── NotificationSettings
```

Important decision:

**Global identity is independent from school/server membership.**

---

# 36. PHASE 4 — Social Graph

Build:

- follow
- unfollow
- block
- mute
- close-friends/favorites foundation
- relationship queries
- follower/following lists

Future optimization:

- graph query SQL
- Redis caching
- denormalized counters

---

# 37. PHASE 5 — Server / Organization System

Complete:

- server creation
- membership
- roles
- permissions
- categories
- channels
- invites
- moderation
- announcements
- events
- threads

Server template system:

```text
Create Server
    ↓
Create Owner Membership
    ↓
Create Default Roles
    ↓
Create Default Channels
    ↓
Apply Template
```

---

# 38. PHASE 6 — Feed System

Feed filters planned:

```text
Latest
Following
Communities/Servers
News
Local
Trending
AI Recommended
```

Architecture should separate:

```text
Feed Collection
Feed Ranking
Feed Filtering
Feed Hydration
Feed Pagination
```

Future technology:

- PostgreSQL
- Redis
- background jobs
- ranking service
- recommendation service

Do not build an AI recommender first. Build a deterministic feed first.

---

# 39. PHASE 7 — Community Messaging Completion

Remaining/expansion topics:

### Messages

- pagination
- cursor pagination
- history
- search
- threads
- replies
- mentions
- attachments
- link previews
- editing history
- deleted-message behavior

### Realtime

- presence
- typing indicators
- read receipts
- delivery states
- reconnect handling
- missed events
- event ordering
- idempotency

### Rooms

```text
server room
channel room
user room
```

---

# 40. Cursor Pagination

Do not rely on:

```text
offset 100000
```

for huge message histories.

Prefer:

```text
cursor
limit
before
after
```

Use indexed fields such as:

```text
createdAt
id
```

A stable cursor may use:

```text
(createdAt, id)
```

to avoid duplicate/missing records when timestamps collide.

---

# 41. Message Ordering

Realtime systems can deliver events out of order.

Future event payloads should consider:

```text
eventId
messageId
serverTimestamp
sequence/version
```

Clients should be able to detect stale updates.

---

# 42. Idempotency

Important for:

- send message
- reactions
- uploads
- payment-like operations
- notification delivery

Future send-message request may contain:

```text
clientMessageId
```

Server guarantees that retrying the same request does not create duplicate messages.

---

# 43. Presence

Presence should not be stored as a normal PostgreSQL write on every heartbeat.

Use Redis for ephemeral state.

Example:

```text
user:{id}:presence
```

Possible states:

```text
online
idle
offline
dnd
invisible
```

---

# 44. Typing Indicators

Typing state is ephemeral.

Use Redis / Socket.IO.

Do not persist every keystroke.

Events:

```text
typing-started
typing-stopped
```

Use debounce/throttle.

---

# 45. Read Receipts

Future model:

```text
Conversation/Channel
    ↓
User/Member
    ↓
lastReadMessageId
```

Avoid creating one database row per every read event if it can be represented by a moving cursor.

---

# 46. Notifications

Build after messaging foundations.

Types:

```text
message
mention
reaction
follow
server invite
friend request
announcement
system
```

Architecture:

```text
Domain Event
    ↓
Notification Service
    ↓
Persistent Notification
    ↓
Push / WebSocket / Email
```

---

# 47. Redis / Performance Phase

Redis responsibilities:

- caching
- sessions
- rate limiting
- presence
- typing state
- pub/sub
- distributed locks where necessary
- background job coordination

Do not use Redis as the primary durable database.

---

# 48. Background Jobs

Future technology:

- BullMQ
- Redis

Jobs:

```text
email
push notification
media processing
thumbnail generation
link preview
feed recomputation
search indexing
cleanup
analytics
```

---

# 49. Media Infrastructure

Production storage:

```text
Client
  ↓
Signed upload URL
  ↓
Cloudflare R2
  ↓
CDN
```

Backend should not unnecessarily proxy large media files.

Media concepts:

- signed URLs
- MIME validation
- file size limits
- antivirus scanning
- image processing
- thumbnails
- video transcoding
- metadata stripping
- access control

---

# 50. Search

Future search architecture:

```text
PostgreSQL
    ↓
Search Index
```

Potential technologies:

- PostgreSQL full-text search initially
- Meilisearch / OpenSearch later depending scale

Search domains:

- users
- servers
- channels
- messages
- posts

Do not introduce Elasticsearch/OpenSearch before actual search requirements justify it.

---

# 51. Moderation

Moderation must exist separately from privacy architecture.

Capabilities:

- report
- block
- mute
- ban
- server moderation
- content review
- spam detection
- abuse rate limiting
- audit logs

For E2EE messages:

Server-side plaintext moderation is impossible by design.

Therefore private-message abuse handling must rely on:

- user reports
- client-side reporting flow
- optional encrypted report bundles
- metadata abuse controls
- account-level abuse detection
- rate limits

Never secretly decrypt E2EE messages.

---

# 52. Security Phase

Security layers:

```text
Transport
   ↓
Authentication
   ↓
Authorization
   ↓
Validation
   ↓
Rate Limiting
   ↓
Audit Logging
   ↓
Encryption
   ↓
Secrets Management
   ↓
Monitoring
```

Topics:

- CSRF
- XSS
- SSRF
- SQL injection
- mass assignment
- broken access control
- IDOR
- JWT attacks
- refresh-token abuse
- WebSocket abuse
- rate limiting
- brute force
- account enumeration
- malicious uploads
- dependency vulnerabilities

---

# 53. Rate Limiting

Different limits for:

```text
login
register
password reset
send message
reaction
join server
create server
upload
search
WebSocket events
```

Do not use one global rate limit for every operation.

---

# 54. Audit Logging

Sensitive actions:

```text
login
logout
password change
email change
role change
permission change
server ban
server deletion
account deletion
security settings
device registration
```

Audit records should be append-oriented.

---

# 55. Privacy Architecture

Privacy settings should eventually cover:

```text
profile visibility
message requests
follow permissions
server discovery
online status
last seen
read receipts
typing indicators
search visibility
email visibility
phone visibility
activity visibility
```

---

# 56. Encryption at Rest

Normal cloud-backed data:

- PostgreSQL encryption at infrastructure/storage layer
- encrypted backups
- TLS in transit
- object storage encryption

Private E2EE:

- application-level message encryption
- device-held keys
- server stores ciphertext

Do not confuse:

```text
database encryption at rest
```

with:

```text
end-to-end encryption
```

They solve different problems.

---

# 57. E2EE Phase

This phase comes **after community messaging is stable**.

Recommended sequence:

### E2EE Lecture 1

Cryptography fundamentals.

### E2EE Lecture 2

Threat model.

### E2EE Lecture 3

Signal Protocol architecture.

### E2EE Lecture 4

Identity keys.

### E2EE Lecture 5

Prekeys.

### E2EE Lecture 6

Session establishment.

### E2EE Lecture 7

Double Ratchet.

### E2EE Lecture 8

Message encryption/decryption.

### E2EE Lecture 9

Multi-device sessions.

### E2EE Lecture 10

Key rotation.

### E2EE Lecture 11

Safety-number/key-verification concepts.

### E2EE Lecture 12

Group encryption.

### E2EE Lecture 13

Encrypted attachments.

### E2EE Lecture 14

Offline delivery.

### E2EE Lecture 15

Device revocation.

### E2EE Lecture 16

Encrypted backup/recovery tradeoffs.

---

# 58. E2EE Server Data Model

Server may store:

```text
messageId
conversationId
senderDeviceId
recipient/device routing data
ciphertext
createdAt
delivery status
encrypted attachment references
```

Server must not need:

```text
plaintext
identity private keys
session private state
```

---

# 59. E2EE Multi-Device Architecture

One user may have:

```text
User
├── Device A
├── Device B
└── Device C
```

Each device has cryptographic identity/session state.

Future architecture:

```text
User Identity
    ↓
Device Registry
    ↓
Device Public Keys
    ↓
Encrypted Session Distribution
```

Device removal must invalidate future encrypted sessions.

---

# 60. E2EE Attachments

Message content may be encrypted, but large files need separate handling.

Possible flow:

```text
Client
 ↓
Generate random file key
 ↓
Encrypt file locally
 ↓
Upload encrypted file
 ↓
Server stores ciphertext
 ↓
Message contains encrypted file metadata/key
```

The exact key distribution must follow the selected Signal-style design.

---

# 61. Advanced Realtime Architecture

At larger scale:

```text
Socket.IO Gateway
      ↓
Redis adapter / pub-sub
      ↓
Multiple API instances
```

Potential future evolution:

```text
API
Realtime Gateway
Message Service
Notification Service
Presence Service
```

Do not split into microservices until operational complexity is justified.

---

# 62. Modular Monolith Strategy

Nexus should initially remain a:

**Modular Monolith**

Benefits:

- faster development
- simpler transactions
- simpler local development
- fewer deployment problems
- clear domain boundaries

Possible future extraction:

```text
Media Service
Realtime Service
Notification Service
Search Service
Recommendation Service
E2EE Delivery Service
```

Only extract when scale/team/operational requirements justify it.

---

# 63. Event-Driven Architecture

Introduce domain events gradually.

Example:

```text
MessageCreated
    ↓
Notification
    ↓
Analytics
    ↓
Search indexing
    ↓
Realtime broadcast
```

Prefer events for side effects.

Do not make every business operation asynchronous.

---

# 64. Outbox Pattern

When reliable event publishing becomes necessary:

```text
Database Transaction
    ├── business data
    └── outbox event
```

Then:

```text
Outbox Worker
    ↓
Redis / Queue / Event Bus
```

This prevents:

```text
database succeeded
event publish failed
```

inconsistency.

---

# 65. Observability

Production observability must include:

## Logs

- structured JSON
- correlation ID
- user/session context where safe
- request duration
- event name

## Metrics

- request latency
- error rate
- DB latency
- Redis latency
- WebSocket connections
- messages/sec
- queue depth
- CPU/memory
- cache hit rate

## Traces

Use OpenTelemetry.

Trace:

```text
HTTP request
 ↓
service
 ↓
repository
 ↓
PostgreSQL
```

and:

```text
WebSocket event
 ↓
command service
 ↓
database
 ↓
broadcast
```

---

# 66. Production Database Strategy

PostgreSQL production practices:

- indexes
- connection pooling
- migrations
- backups
- point-in-time recovery
- read replicas when needed
- query monitoring
- slow-query analysis
- vacuum/autovacuum awareness
- partitioning only when justified

---

# 67. Caching Strategy

Use cache-aside where appropriate:

```text
Request
 ↓
Redis?
 ├── hit → return
 └── miss
       ↓
     PostgreSQL
       ↓
     Redis
```

Never cache authorization data without considering invalidation.

Permission changes must invalidate relevant caches.

---

# 68. API Versioning

Eventually:

```text
/api/v1
```

When breaking changes are required:

```text
/api/v2
```

Prefer additive evolution whenever possible.

---

# 69. API Contract Strategy

Frontend should not guess backend behavior.

Use:

- Swagger/OpenAPI
- DTOs
- shared contract package where appropriate
- typed client generation later

Potential future:

```text
OpenAPI
  ↓
Generated TypeScript client
  ↓
Next.js
```

---

# 70. Frontend Start Gate

Frontend begins after this backend milestone:

## Backend Vertical Slice Complete

### Identity

- auth
- session
- user profile

### Server

- create server
- membership
- roles
- permissions
- channel creation

### Messaging

- message history
- send
- edit
- delete
- pin
- unpin
- reactions
- WebSocket realtime
- room authorization

### Infrastructure

- Swagger
- validation
- exceptions
- logging
- tests
- Redis foundation

Then:

```text
START NEXT.JS
```

---

# 71. Frontend Development Does Not Stop Backend Development

After frontend begins:

```text
Frontend Track
       ↘
        API Contract
       ↗
Backend Track
```

Both tracks continue.

The backend remains the source of truth for:

- authorization
- persistence
- security
- business rules

Frontend never replaces backend validation.

---

# 72. Future Frontend/Backend Parallel Flow

```text
Backend:
Messaging → Notifications → Search → Media → Security

Frontend:
Auth UI → Server UI → Channel UI → Messaging UI → Feed UI

Mobile:
Later
```

---

# 73. Admin Backend

Future admin capabilities:

- user moderation
- server moderation
- reports
- abuse detection
- system health
- audit logs
- feature flags
- configuration
- support tools

Admin permissions must be separated from normal server permissions.

---

# 74. Feature Flags

Production rollout should eventually support:

```text
feature flag
    ↓
percentage rollout
    ↓
user cohort
    ↓
server cohort
```

Useful for:

- new messaging system
- E2EE beta
- new feed ranking
- AI features
- new UI

---

# 75. AI Architecture

AI should be added after core deterministic systems are stable.

Potential AI features:

- feed recommendations
- moderation assistance
- spam detection
- summarization
- search ranking
- smart replies
- content recommendations

AI must not become the source of truth for authorization.

---

# 76. Security + AI

Never send private E2EE plaintext to a centralized AI backend unless the user explicitly chooses such a feature and the privacy model clearly permits it.

For private E2EE:

```text
AI feature
    ↓
prefer on-device processing
```

where practical.

---

# 77. Production Deployment

Initial:

```text
Docker
    ↓
VPS / Cloud VM
    ↓
Nginx / Reverse Proxy
    ↓
NestJS
```

Database:

```text
Managed PostgreSQL preferred
```

Storage:

```text
Cloudflare R2
```

Redis:

```text
Managed Redis or dedicated Redis
```

CDN:

```text
Cloudflare
```

---

# 78. CI/CD

Pipeline:

```text
Push
 ↓
Lint
 ↓
Typecheck
 ↓
Unit tests
 ↓
Integration tests
 ↓
Build
 ↓
Docker image
 ↓
Security scan
 ↓
Deploy staging
 ↓
Smoke tests
 ↓
Production
```

Tools can include:

- GitHub Actions
- Docker
- Dependabot/Renovate
- Trivy
- Snyk or equivalent

---

# 79. Database Migration Rules

Never manually modify production schema.

Use:

```bash
pnpm prisma migrate dev
```

during development and controlled deployment migrations in production.

Before migration:

- backup strategy
- rollback plan
- compatibility review

Avoid destructive migrations without a staged rollout.

---

# 80. API Security Checklist

Before production:

- [ ] CORS configured
- [ ] HTTPS
- [ ] secure cookies where applicable
- [ ] JWT expiry
- [ ] refresh rotation
- [ ] rate limiting
- [ ] DTO validation
- [ ] authorization
- [ ] IDOR testing
- [ ] SQL injection testing
- [ ] SSRF protection
- [ ] upload validation
- [ ] secret management
- [ ] dependency scanning
- [ ] security headers
- [ ] audit logs
- [ ] monitoring

---

# 81. WebSocket Security Checklist

- [ ] JWT authentication
- [ ] socket identity
- [ ] membership verification
- [ ] permission verification
- [ ] event payload validation
- [ ] room authorization
- [ ] rate limiting
- [ ] message size limit
- [ ] reconnect handling
- [ ] stale session handling
- [ ] disconnect cleanup
- [ ] duplicate event protection
- [ ] broadcast authorization

---

# 82. Messaging Production Checklist

- [ ] cursor pagination
- [ ] stable ordering
- [ ] idempotency
- [ ] retries
- [ ] offline delivery
- [ ] read state
- [ ] typing
- [ ] presence
- [ ] attachments
- [ ] message search
- [ ] moderation
- [ ] audit strategy
- [ ] rate limits
- [ ] abuse prevention
- [ ] realtime scaling

---

# 83. E2EE Production Checklist

- [ ] established protocol/library
- [ ] threat model
- [ ] device identity
- [ ] key verification
- [ ] prekey handling
- [ ] session establishment
- [ ] ratchet state
- [ ] multi-device
- [ ] device revocation
- [ ] encrypted attachments
- [ ] offline messages
- [ ] key recovery strategy
- [ ] backup security
- [ ] cryptographic review
- [ ] external security audit

---

# 84. Important Architectural Decisions

## Decision 1

**Modular monolith first.**

Reason:

- simplicity
- speed
- transaction consistency
- easier debugging

---

## Decision 2

**PostgreSQL is the source of truth.**

Redis is not the primary database.

---

## Decision 3

**Prisma + SQL hybrid.**

Prisma for standard operations.

SQL for performance-critical graph/feed queries.

---

## Decision 4

**Server is the main community collaboration unit.**

Not generic communities.

---

## Decision 5

**Hybrid messaging.**

Cloud-backed server channels and standard DMs.

Signal-style E2EE for private DMs and secret groups.

---

## Decision 6

**Do not invent cryptography.**

Use established Signal Protocol implementations.

---

## Decision 7

**Backend first, frontend after the messaging vertical slice.**

---

## Decision 8

**Server-side invalidatable authentication sessions.**

---

## Decision 9

**Permissions are centralized.**

Use `ServerPermission` and `ServerPermissionService`.

---

## Decision 10

**Business logic does not belong in gateways/controllers.**

Gateways/controllers coordinate transport.

Services implement behavior.

---

# 85. Common Mistakes Already Encountered

## Mistake: `UseGuards` imported from wrong package

Correct:

```ts
import { UseGuards } from '@nestjs/common';
```

not:

```ts
import { UseGuards } from '@nestjs/websockets';
```

---

## Mistake: Markdown fences accidentally pasted into `.ts`

Never put:

```text
```
```

inside the source file.

Only the assistant response should have code fences.

---

## Mistake: `serverId` assumed to exist in request

If the request only contains:

```text
channelId
content
parentMessageId
```

derive the server from the channel:

```text
channel → serverId
```

Do not trust arbitrary serverId from the client.

---

## Mistake: Calling `hasPermission` with wrong argument order

Correct:

```ts
hasPermission(
  serverId,
  userId,
  ServerPermission.MANAGE_MESSAGES,
);
```

---

## Mistake: Reaction repository renamed incorrectly

Do not overwrite:

```text
channel-message.repository.ts
```

with reaction repository code.

Keep:

```text
channel-message.repository.ts
```

for:

```text
ChannelMessageRepository
```

and:

```text
channel-message-reaction.repository.ts
```

for:

```text
ChannelMessageReactionRepository
```

---

## Mistake: Reaction schema using `userId`

If reaction ownership is through `ServerMember`, use:

```text
memberId
```

and unique constraint:

```text
messageId_memberId_emoji
```

---

## Mistake: Missing repository provider

Every injectable repository must be available in the module:

```ts
@Module({
  providers: [
    ChannelMessageRepository,
    ChannelMessageReactionRepository,
    ...
  ],
})
```

---

## Mistake: Gateway self-reference

Do not inject:

```text
ChannelMessageGateway
```

into itself.

Use:

```text
Realtime/Broadcast service
```

when a non-gateway service needs realtime publishing.

---

# 86. Recommended Future Realtime Abstraction

Eventually create:

```text
src/core/realtime/
├── realtime.module.ts
├── realtime.service.ts
├── realtime-event.types.ts
└── realtime-broadcast.service.ts
```

Then:

```text
CommandService
      ↓
RealtimeBroadcastService
      ↓
Socket.IO
```

This removes business-service dependence on the gateway.

---

# 87. Future Domain Event Model

Example:

```ts
MessageCreatedEvent
{
  messageId: string;
  channelId: string;
  serverId: string;
  authorMemberId: string;
  occurredAt: Date;
}
```

Then:

```text
CommandService
    ↓
Domain Event
    ├── realtime
    ├── notifications
    ├── search indexing
    └── analytics
```

---

# 88. Production Event Naming

Keep names stable.

Example:

```text
message.created
message.updated
message.deleted
message.pinned
message.unpinned

reaction.added
reaction.removed
```

Transport-level names may remain:

```text
message-created
reaction-added
```

but internal domain event names can use dot notation.

---

# 89. Error Contract

All HTTP/WebSocket errors should have predictable shapes.

Conceptually:

```json
{
  "code": "MESSAGE_NOT_FOUND",
  "message": "Message not found",
  "requestId": "..."
}
```

Do not expose:

- SQL errors
- Prisma internals
- stack traces
- secret information

in production responses.

---

# 90. Security Threat Modeling

Before sensitive modules:

```text
Assets
 ↓
Threats
 ↓
Attack Surface
 ↓
Mitigation
 ↓
Residual Risk
```

Threat model:

### Authentication

- credential theft
- token theft
- refresh token replay

### Messaging

- unauthorized room join
- IDOR
- message spoofing
- duplicate events
- spam

### E2EE

- device compromise
- key theft
- MITM
- malicious client
- metadata leakage

---

# 91. Performance Targets

Targets should be measured rather than guessed.

Track:

```text
p50
p95
p99
```

for:

- API latency
- database queries
- WebSocket event handling
- message send
- message history
- Redis operations

---

# 92. Load Testing

Future tools:

- k6
- Artillery
- autocannon

Scenarios:

```text
10k connections
1000 concurrent message sends
large channel history
many reactions
server joins
feed requests
```

---

# 93. Disaster Recovery

Production must eventually include:

- automated backups
- backup verification
- point-in-time recovery
- restore drills
- RPO
- RTO
- multi-zone considerations

Definitions:

```text
RPO = acceptable data loss
RTO = acceptable recovery time
```

---

# 94. Scaling Strategy

Scale in this order:

```text
Optimize queries
    ↓
Indexes
    ↓
Caching
    ↓
Connection pooling
    ↓
Background jobs
    ↓
Horizontal API scaling
    ↓
Realtime scaling
    ↓
Read replicas
    ↓
Service extraction
```

Do not jump directly to microservices.

---

# 95. Lecture Naming Convention

Continue using:

```text
Lecture 40.x
```

for the current Messaging/WebSocket series.

After Messaging:

```text
Lecture 41.x — Notifications
Lecture 42.x — Redis / Performance
Lecture 43.x — Media
Lecture 44.x — Search
Lecture 45.x — Moderation
Lecture 46.x — Privacy
Lecture 47.x — E2EE / Signal
Lecture 48.x — Production Hardening
```

The exact numbering can be adjusted when a phase is expanded.

---

# 96. Current Messaging Lecture Sequence

Known sequence:

```text
40.9  ChannelMessageGateway
40.10 Integrate Gateway with CommandService
40.11 Authenticate WebSocket Connections with JWT
40.12 Authorize WebSocket Channel Access
40.13 Secure WebSocket Message Sending
40.14 Implement send-message WebSocket Event
40.15 Broadcast Message Events & Room-Based Delivery
40.16 Update/Edit Message WebSocket Event
40.17 Delete Message WebSocket Event
40.18 Pin/Unpin Message WebSocket Events
40.19 Message Reactions WebSocket Events
40.20 ChannelMessageReactionQueryService
40.21 Reaction Query WebSocket Events
40.22 Broadcast Reaction Events to Channel Rooms
```

Subsequent logical topics (status marks reflect the merged master roadmap in `PROJECT_DETAIL.md`):

```text
40.23 Message Pagination          (completed)
40.24 Cursor-Based History        (completed)
40.25 Read State                  (completed)
40.26 Typing Indicators           (completed)
40.27 Presence                    (completed)
40.28 Delivery State              (partial — read/receipt events only)
40.29 Reconnect / Missed Events   (completed)
40.30 Idempotent Message Sending  (completed)
40.31 Message Attachments         (completed)
40.32 Message Threads             (partial — parentMessageId field exists; thread UX/REST future)
40.33 Mentions                    (completed)
40.34 Message Search              (completed — part 1; part 2 is master 40.74)
40.35 Realtime Abstraction        (later phase — gateway broadcasts are still direct)
40.36 Outbox / Domain Events      (completed)
40.37 Messaging Tests             (completed)
40.38 Load Testing                (future)
40.39 Messaging Security Hardening (completed)
40.40 Messaging Vertical-Slice Completion (completed)
```

---

# 97. Lecture 40.26

The current logical progression after reaction broadcasting should continue toward realtime state.

A strong sequence is:

```text
40.23 Cursor-Based Message Pagination
40.24 Message History API
40.25 Read / Unread State
40.26 Typing Indicators
40.27 Presence
40.28 Delivery State
```

### 40.26 goal

Implement ephemeral typing state without persisting every keystroke.

Flow:

```text
client
 ↓
typing-started
 ↓
authenticate socket
 ↓
authorize channel
 ↓
rate-limit/debounce
 ↓
broadcast to channel room
```

Do not store every typing event in PostgreSQL.

Use Socket.IO/Redis for ephemeral state.

---

# 98. What Happens Before Frontend

Complete at minimum:

```text
Authentication
Authorization
Users
Servers
Server Members
Roles
Permissions
Channels
Messages
Message Reactions
Message Pagination
Read State
Typing
Presence foundation
Realtime
Notifications foundation
Redis foundation
Swagger
Tests
Security hardening
```

Then begin:

```text
Next.js
```

---

# 99. Frontend Integration Strategy

First frontend screens:

```text
Login
Register
Session restore
Home
Server list
Server
Channel
Message list
Message composer
Reactions
Realtime updates
```

Do not begin with every page.

Build one complete vertical slice:

```text
Login
 ↓
Home
 ↓
Server
 ↓
Channel
 ↓
Realtime Message
```

---

# 100. Mobile Strategy

After web foundation:

```text
React Native
 ↓
shared API contracts
 ↓
shared auth/session logic
 ↓
messaging
 ↓
push notifications
 ↓
E2EE device identity
```

E2EE implementation must account for native secure key storage.

Potential platform primitives:

- Android Keystore
- iOS Keychain / Secure Enclave where applicable

Never store long-term private keys in plain AsyncStorage.

---

# 101. Production Secret Management

Development:

```text
.env.development
```

Production:

Use:

- cloud secret manager
- environment secrets
- Vault
- managed secrets platform

Never commit:

```text
JWT_SECRET
DATABASE_URL
API_KEYS
R2_SECRET
ENCRYPTION_KEYS
```

---

# 102. Dependency Management

Use:

- pnpm
- lockfile
- automated dependency updates
- security scans

Before upgrading critical packages:

```text
NestJS
Prisma
Socket.IO
JWT
crypto libraries
```

run:

```text
typecheck
unit tests
integration tests
e2e tests
```

---

# 103. Definition of Done

A lecture is not complete merely because TypeScript compiles.

Definition:

```text
Code written
+
Architecture explained
+
Module integrated
+
Typecheck clean
+
Runtime clean
+
Manual test
+
Automated test where appropriate
+
Security reviewed
+
Git commit
```

---

# 104. Definition of Production Ready

A module is production-ready when:

- business rules are explicit
- authorization is enforced
- validation exists
- error behavior is stable
- database indexes exist
- queries are reviewed
- tests exist
- logs exist
- metrics exist
- rate limits exist where necessary
- security risks are reviewed
- migrations are safe
- API contracts are documented
- failure/retry behavior is understood

---

# 105. Master Roadmap

```text
PHASE 1
Foundation
    ↓
PHASE 2
Auth + Authorization
    ↓
PHASE 3
Users / Identity
    ↓
PHASE 4
Social Graph
    ↓
PHASE 5
Servers / Organizations
    ↓
PHASE 6
Feed
    ↓
PHASE 7
Community Messaging
    ↓
PHASE 8
Realtime + Messaging Hardening
    ↓
PHASE 9
Privacy + Signal E2EE
    ↓
PHASE 10
Notifications
    ↓
PHASE 11
Redis + Performance
    ↓
PHASE 12
Media
    ↓
PHASE 13
Search
    ↓
PHASE 14
Moderation
    ↓
PHASE 15
Observability
    ↓
PHASE 16
Production Infrastructure
    ↓
PHASE 17
Advanced Security
    ↓
PHASE 18
Backend API Stabilization
    ↓
========================
FRONTEND START GATE
========================
    ↓
PHASE 19
Next.js Web
    ↓
PHASE 20
React Native
```

---

# 106. Immediate Next Steps

Do not jump to frontend yet.

Continue the messaging/private-messaging roadmap in the master sequence (`PROJECT_DETAIL.md`).

The prior immediate sequence is now complete through **40.81 Multi-Instance WebSocket Scaling** (Scale phase):

```text
40.23 — Cursor-Based Message Pagination        (completed)
40.24 — Message History API                    (completed)
40.25 — Read / Unread State                    (completed)
40.26 — Typing Indicators                      (completed)
40.27 — Presence                               (completed)
40.28 — Delivery State                         (partial — read/receipt events)
40.29 — Reconnect / Missed Events              (completed)
40.30 — Idempotent Message Sending             (completed)
40.31 — Message Attachments                    (completed)
40.32 — Message Threads                        (partial — foundation only)
40.33 — Mentions                               (completed)
40.34 — Message Search                         (completed — part 1)
40.35 — Realtime Abstraction                   (later phase)
40.36 — Domain Events / Outbox                 (completed)
40.37 — Messaging Automated Tests              (completed)
40.38 — Messaging Load Testing                 (future)
40.39 — Messaging Security Hardening           (completed)
40.40 — Messaging Vertical-Slice Completion    (completed)
40.61 — Distributed WebSocket Scaling (Redis adapter foundation) (completed)
40.62 — Direct Message Domain (Type B)         (completed)
```

Recommended next sequence:

```text
40.63 — Private E2EE Messaging Foundation (crypto fundamentals, threat model, Signal Protocol architecture)   (completed)
40.64 — E2EE Device and Key Management (multi-device identity keys)                                           (completed)
40.65 — Key Distribution Backend (prekey server)                                                              (completed)
40.66 — Session Establishment                                                                                   (completed)
40.67 — Double Ratchet                                                                                          (completed)
40.68 — E2EE Message Transport (encryption/decryption + encrypted persistence)                                  (completed)
40.69 — E2EE Multi-Device + Key Rotation + Safety-Number Verification                                          (completed)
40.70 — Secret Groups / E2EE Group Messaging                                                                    (completed)
40.71 — E2EE Attachments                                                                                        (completed)
40.73 — E2EE Metadata Minimization                                                                              (completed)
40.74 — Message Search — Part 2 (MeiliSearch, BM25 ranking)                                                     (completed)
40.75 — Media Pipeline — Part 2 (AV scan, thumbnails, transcoding via BullMQ)                                   (completed)
40.76 — Background Jobs (BullMQ full set)                                                                       (completed)
40.77 — Structured Logging                                                                                       (completed)
40.78 — Distributed Tracing                                                                                      (completed)
40.79 — Production Metrics                                                                                       (completed)
40.80 — Scale, Performance, Testing, Production (1M-User Load Model)                                            (completed)
40.81 — Multi-Instance WebSocket Scaling (node registry + adapter hardening)                                     (completed)
40.82 — Load-model-driven DB/query optimisation (`src/core/db/query-optimizer/`, `GET /load-model/optimiser`)       (completed)
40.83 — Cache Architecture (`src/core/cache/`, `GET /load-model/cache`)                                               (completed)
40.84 — API Versioning / Evolution (`src/core/api-versioning/`, `GET /v1/api` & `GET /v2/api`)                            (completed)
40.85 — OpenAPI/Swagger Hardening (`buildSwaggerConfig`, `VALIDATION_PIPE_OPTIONS`)                                        (completed)
40.86 — API & WebSocket Contract Tests (`src/core/contracts/` `ContractManifest`)                                             (completed)
40.87 — Database Integration Tests (`src/testing/db/` `npm run test:db`)                                                   (completed)
40.88 — Redis Integration Tests (`src/testing/redis/` `npm run test:redis`)                                                    (completed)
40.89 — Messaging E2E Tests (`test/` `npm run test:e2e`)                                                                         (completed)
40.90 — Failure Injection Testing (`src/testing/failure/` + `test/websocket-unavailable.fail-inj.spec.ts` `npm run test:failures`)   (completed)
40.91 — Production Deployment Architecture                                                                                       [NEXT/CURRENT]
```

---

# 107. Final Architectural Rule

When deciding whether to add a technology, ask:

```text
What problem does it solve?
        ↓
Do we have that problem yet?
        ↓
Can PostgreSQL/NestJS/Redis solve it?
        ↓
What is the operational cost?
        ↓
What is the failure mode?
        ↓
Will it make future scaling easier or harder?
```

The goal is not to use the maximum number of technologies.

The goal is:

**minimum unnecessary complexity + strong boundaries + production-grade security + measurable scalability.**

---

# 108. Current Project Status Snapshot

```text
Backend Foundation              ████████████████████  High progress
Authentication                  ████████████████████  Implemented foundation
Authorization                   ████████████████████  Implemented foundation
Users                           ████████████████████  Progressed
Servers                         ████████████████████  Progressed
Messaging                       ████████████████████  Implemented through 40.62
WebSocket Authentication        ████████████████████  Done
Channel Authorization           ████████████████████  Done
Message CRUD                    ████████████████████  Done/foundation
Pin/Unpin                       ████████████████████  Done/foundation
Reactions                       ████████████████████  Done/foundation
Pagination                      ████████████████████  Done (cursor-based)
Typing                          ████████████████████  Done
Presence                        ████████████████████  Done (Redis-backed)
Direct Messages (Type B)        ████████████████████  Done (40.62)
Distributed WebSocket Scaling   █████████████░░░░░░░  Redis adapter foundation (40.61)
E2EE                            ████████████████████  Foundation + device/key mgmt + key dist + session + transport + groups + attachments + metadata minimization (40.63–40.73)
Message Search                  ████████████████████  Part 1 + Part 2 (MeiliSearch) done
Media Pipeline                  ████████████████████  Part 2 (AV scan/thumbnails/transcoding via BullMQ) done
Background Jobs                 ████████████████████  BullMQ full set done (40.76)
Observability                   ████████████████████  Structured Logging (40.77) + Distributed Tracing (40.78) + Production Metrics /metrics (40.79) done
Scale / Load                    ████████████████████  load model (40.80) + multi-instance WS (40.81) + DB/query optimisation (40.82) + cache architecture (40.83) + API versioning (40.84) + Swagger hardening (40.85) + contract tests (40.86) + DB integration tests (40.87) + Redis integration tests (40.88) + Messaging E2E tests (40.89) + Failure Injection testing (40.90) done; Production Deployment Architecture (40.91) next
Frontend                        ░░░░░░░░░░░░░░░░░░░░  After backend gate
Mobile                          ░░░░░░░░░░░░░░░░░░░░  Later
Production hardening            ░░░░░░░░░░░░░░░░░░░░  Future
```

---

# 109. Working Rule for Future Lectures

For every future request such as:

> "Lecture 40.xx"

continue from this document and provide:

1. lecture objective
2. first-principles explanation
3. Nexus architectural decision
4. exact folder path
5. exact file names
6. implementation
7. integration changes
8. compile/test commands
9. expected result
10. common errors
11. security considerations
12. production considerations
13. Git commit
14. what the next lecture should be

This document is the source-of-truth roadmap for continuing Nexus backend development.
