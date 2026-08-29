# Nexus Backend Roadmap

## Current Version / Continuation Guide

> **Purpose:** This document is the working backend roadmap for Nexus.
> It starts from the current implementation point and defines the
> remaining backend work in implementation order.
>
> **Current position:** Messaging WebSocket gateway validation hardening
> (40.28–40.30), **40.31 (Message History + Cursor Pagination)**,
> **40.32 (Message Query Optimization)**, **40.33 (Message Thread /
> Reply Queries)**, **40.34 (Message Edit History)**, **40.35
> (Message Delete Semantics)**, and **40.36 (Mentions)** are
> **completed**.
>
> **Next lecture (merged numbering, authoritative per `PROJECT_DETAIL.md`
> §4):** 40.37 — Read / Unread State.
>
> **Important:** This roadmap preserves the architecture and decisions
> already established for Nexus. It is intended to be usable without the
> original ChatGPT conversation.

------------------------------------------------------------------------

# 1. Backend Mission

Nexus is being built as a large-scale social/community platform with a
strong messaging system and server-based collaboration model.

The backend must eventually support:

-   global user identity
-   authentication and authorization
-   servers
-   server membership
-   roles and permissions
-   channels
-   messaging
-   message replies
-   editing/deleting messages
-   pinning
-   reactions
-   WebSocket real-time delivery
-   cloud-backed community/server messaging
-   standard cloud-backed direct messaging
-   private E2EE direct messaging using the Signal Protocol
-   secret/private groups
-   social graph
-   feeds
-   notifications
-   Redis-backed performance infrastructure
-   advanced security
-   scalable media and infrastructure

The backend is intentionally being completed before frontend
development.

------------------------------------------------------------------------

# 2. LOCKED Development Strategy

## 2.1 Backend first

The project follows a backend-first workflow.

The frontend does **not** begin while the core backend is incomplete.

The current backend priority is to finish the Messaging backend module
and its supporting infrastructure.

Only after the agreed backend milestone is complete should frontend
development begin.

------------------------------------------------------------------------

# 3. Locked Architecture Principles

## 3.1 Modular monolith

Nexus backend is currently being developed as a modular NestJS backend
rather than immediately splitting into microservices.

Reason:

-   simpler development
-   strong module boundaries
-   easier local development
-   easier transactions
-   easier debugging
-   lower operational complexity during the first large implementation
-   modules can later be extracted if actual scaling requirements
    justify it

Do not convert the project to microservices without explicitly
revisiting the architecture decision.

------------------------------------------------------------------------

## 3.2 Domain-first module structure

Business modules should remain organized around domain responsibility.

Typical structure:

``` text
src/
├── common/
├── core/
├── config/
└── modules/
    ├── auth/
    ├── users/
    ├── servers/
    ├── messages/
    └── ...
```

Within business modules, the project has been using responsibilities
such as:

``` text
controllers/
gateways/
services/
repositories/
dto/
types/
constants/
exceptions/
mappers/
```

Do not move business logic randomly into controllers or gateways.

------------------------------------------------------------------------

## 3.3 Repository pattern

Database access is isolated behind repositories.

The purpose is to:

-   keep Prisma/database details out of business services
-   make services easier to test
-   centralize queries
-   provide a stable data-access boundary
-   make future query optimization easier

Example messaging pattern:

``` text
Gateway
   ↓
Command / Query Service
   ↓
Validation Service
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

------------------------------------------------------------------------

## 3.4 CQRS-style separation

Messaging uses command/query separation.

### Command side

Responsible for mutations:

-   create message
-   update message
-   delete message
-   pin/unpin
-   add/remove reaction

### Query side

Responsible for reading:

-   get message
-   get messages
-   get reactions
-   get reaction information

Do not mix large mutation workflows into query services.

------------------------------------------------------------------------

# 4. Current Backend State

The project has reached the Messaging WebSocket hardening stage.

The following messaging functionality has already been
implemented/discussed through the current roadmap:

-   channel message validation
-   message creation
-   WebSocket `send-message`
-   room-based message broadcasting
-   update/edit message WebSocket event
-   delete message WebSocket event
-   pin message WebSocket event
-   unpin message WebSocket event
-   add reaction WebSocket event
-   remove reaction WebSocket event
-   reaction query service
-   reaction query WebSocket events
-   reaction room broadcasting
-   WebSocket authentication/authorization hardening
-   WebSocket rate limiting/message spam protection
-   WebSocket DTOs
-   WebSocket validation pipe
-   gateway-wide WebSocket validation

The project also has a Redis service based on the Node Redis client.

------------------------------------------------------------------------

# 5. Current Messaging DTO Layer

The WebSocket DTO directory is:

``` text
src/modules/messages/dto/websocket/
```

The DTO set includes:

``` text
send-channel-message.request.ts
update-channel-message.request.ts
delete-channel-message.request.ts
pin-channel-message.request.ts
unpin-channel-message.request.ts
add-message-reaction.request.ts
remove-message-reaction.request.ts
```

The project has introduced:

-   `class-validator`
-   `class-transformer`
-   a custom `WebSocketValidationPipe`

The validation pipe uses:

``` text
plainToInstance()
validate()
whitelist: true
forbidNonWhitelisted: true
```

This establishes strict WebSocket payload validation.

------------------------------------------------------------------------

# 6. Current WebSocket Security Layer

The messaging gateway now has security responsibilities including:

-   WebSocket authentication
-   authorization
-   payload validation
-   DTO validation
-   rate limiting
-   spam protection
-   room/channel access checks

The gateway must not trust:

-   client-provided user IDs
-   client-provided member IDs
-   client-provided server IDs when they can be derived from
    channel/message state
-   client-provided permission claims
-   arbitrary room identifiers

Identity should come from the authenticated WebSocket connection.

Authorization should be checked against server membership and
permissions.

------------------------------------------------------------------------

# 7. Immediate Next Phase

## Phase 40.29 --- Messaging WebSocket Security Completion — COMPLETED

### Objective

Finish the WebSocket security boundary before adding additional
messaging features.

### Tasks

1.  Verify gateway-wide validation is actually applied to every relevant
    message event.
2.  Verify every gateway payload uses the appropriate DTO.
3.  Verify unknown properties are rejected.
4.  Verify invalid UUIDs are rejected.
5.  Verify empty/oversized message content is rejected.
6.  Verify authenticated user identity comes from `client.data.userId`.
7.  Verify channel access is checked before mutation.
8.  Verify server membership is checked.
9.  Verify permission checks are enforced server-side.
10. Verify rate limiting is applied consistently to mutation events.
11. Verify rate-limit failures use the project's existing
    NestJS-compatible exception strategy.
12. Test valid and invalid payloads for every messaging WebSocket event.

### Important Redis note

The current `RedisService` exposes:

``` text
get()
set()
del()
exists()
getClient()
```

The rate-limit implementation also needs atomic counter operations.

The next implementation should therefore extend Redis access in a
controlled way rather than allowing arbitrary direct Redis access
throughout the application.

Use Redis for:

-   short-lived rate-limit counters
-   temporary state
-   future presence/session infrastructure

Do not use Redis as the primary source of truth for messages.

### Definition of done

Every message mutation event:

-   authenticates the connection
-   validates the DTO
-   validates access
-   checks permissions
-   applies rate limits
-   performs the command
-   broadcasts only after successful persistence

------------------------------------------------------------------------

# 8. Phase 40.30 --- Messaging Integration Test Boundary — COMPLETED

## Objective

Test the entire messaging pipeline before moving to broader backend
modules.

### Test layers

### Unit tests

Test:

-   validation services
-   permission decisions
-   command services
-   query services
-   repository behavior where appropriate

### Gateway tests

Test:

-   authenticated client
-   unauthenticated client
-   invalid DTO
-   unauthorized server member
-   insufficient permission
-   rate-limited client
-   valid message
-   valid update
-   valid delete
-   valid pin/unpin
-   valid reaction
-   valid reaction removal

### Integration tests

Verify:

``` text
WebSocket event
→ authentication
→ DTO validation
→ authorization
→ command service
→ repository
→ PostgreSQL
→ broadcast
```

### Definition of done

The Messaging WebSocket API has automated coverage around its security
and main mutation flows. — **DONE** (validation, query, repository,
rate-limit, controller, and gateway specs are in place; database-backed
E2E tests remain a later phase).

---------------------------------------------------------------------

# 9. Phase 40.31 --- Messaging History and Pagination — COMPLETED

## Objective

Make message retrieval scalable.

A 1M-user system cannot retrieve an entire channel history in one query.

### Approach

Cursor-based pagination implemented:

``` text
latest messages
    ↓
cursor
    ↓
older messages
```

`GetChannelMessagesQuery` / `GetRepliesQuery` DTOs, repository
`findManyByChannelPaginated` / `findRepliesPaginated` / `countReplies`,
query-service `getChannelMessagesPaginated` / `getThreadRepliesPaginated`
with `{ items, nextCursor, hasMore, replyCount }` metadata.

### Definition of done

A channel can load history in bounded pages without scanning the entire
channel. — **DONE** (tsc clean, 9 suites / 37 tests green, build ok).

------------------------------------------------------------------------

# 10. Phase 40.32 --- Reply / Thread Queries — DONE (merged numbering: 40.33)

## Objective

Complete the read side for replies.

Support:

-   parent message
-   child replies
-   reply count
-   loading replies
-   pagination for large reply sets

Do not load an unlimited reply tree in one query.

------------------------------------------------------------------------

# 11. Phase 40.33 --- Message Search

## Objective

Provide scalable message search.

Start with PostgreSQL-supported search capabilities already available in
the chosen database stack.

The search design must account for:

-   server/channel scope
-   permissions
-   deleted messages
-   author
-   date
-   text
-   pagination

Search must never return a message the requesting user is not authorized
to see.

------------------------------------------------------------------------

# 12. Phase 40.34 --- Message Read / Delivery State

## Objective

Add the backend foundation for:

-   delivered
-   read
-   unread
-   last-read message position

For scale, do not create unnecessary database rows for every event if a
compact cursor/state representation is sufficient.

The exact final schema is \[UNKNOWN\] and must be decided from the
existing database model before implementation.

------------------------------------------------------------------------

# 13. Phase 40.35 --- Presence Foundation

## Objective

Introduce online/offline/away presence infrastructure.

Use Redis for ephemeral presence state.

PostgreSQL should remain the durable source of truth.

Potential architecture:

``` text
WebSocket connection
        ↓
Presence Service
        ↓
Redis
        ↓
Presence events
        ↓
Subscribed clients
```

Presence must have expiration/heartbeat behavior so disconnected clients
do not remain permanently online.

------------------------------------------------------------------------

# 14. Phase 40.36 --- Notification Backend Foundation

## Objective

Create a unified notification domain.

Notifications can eventually represent:

-   message mentions
-   replies
-   reactions
-   server events
-   social events
-   system notifications

Use durable database storage for notification history.

Use WebSockets/Redis for real-time delivery.

------------------------------------------------------------------------

# 15. Phase 40.37 --- Messaging Media / Attachment Backend

## Objective

Support message attachments without storing large binary objects
directly inside PostgreSQL.

The existing project has discussed:

-   Cloudflare R2
-   Supabase storage
-   MinIO for local development

The production choice between R2 and other storage is already part of
the project's infrastructure discussions; exact final production bucket
configuration is \[UNKNOWN\].

Recommended project flow:

``` text
Client
 ↓
Backend authorization
 ↓
signed upload authorization
 ↓
object storage
 ↓
message attachment metadata
 ↓
message
```

The message database should store metadata, not the binary file.

------------------------------------------------------------------------

# 16. Phase 40.38 --- Messaging Audit and Moderation

## Objective

Build server moderation capabilities around messages.

Potential responsibilities already aligned with the messaging/server
model:

-   manage messages permission
-   delete moderation
-   pin moderation
-   abuse controls
-   audit trail

The exact audit entity/schema is \[UNKNOWN\].

Do not implement permanent deletion behavior without checking the
project's existing retention/audit decisions.

------------------------------------------------------------------------

# 17. Phase 40.39 --- Advanced Messaging Performance

## Objective

Prepare messaging for very large servers and high message throughput.

### Areas

-   PostgreSQL indexing
-   query plans
-   connection pooling
-   Redis caching
-   Redis Pub/Sub where appropriate
-   WebSocket room fan-out
-   payload size limits
-   backpressure
-   batching
-   event deduplication

### Important rule

Redis is an acceleration/coordination layer, not the source of truth for
durable messages.

PostgreSQL remains authoritative for durable messaging state.

------------------------------------------------------------------------

# 18. Phase 40.40 --- Distributed WebSocket Scaling

## Objective

Allow multiple backend instances to serve WebSocket traffic.

Single-instance WebSockets do not scale to a large deployment by
themselves.

Target architecture:

``` text
                    Load Balancer
                         |
          +--------------+--------------+
          |              |              |
       API/WS 1       API/WS 2       API/WS N
          |              |              |
          +--------------+--------------+
                         |
                       Redis
                         |
                     PostgreSQL
```

Responsibilities:

-   WebSocket connection distribution
-   cross-instance event propagation
-   room membership coordination
-   presence coordination
-   rate-limit coordination

Do not assume an in-memory room map is sufficient once multiple
instances exist.

------------------------------------------------------------------------

# 19. Phase 40.41 --- Server Module Completion

The server model is a primary Nexus collaboration primitive.

Server architecture is intended to support:

-   server
-   categories
-   channels
-   roles
-   permissions
-   members
-   invites
-   announcements
-   events
-   threads
-   future voice/live functionality

Complete missing backend capabilities before frontend implementation
depends on them.

------------------------------------------------------------------------

# 20. Phase 40.42 --- Social Graph Backend

## Objective

Build the social relationship layer.

The project has discussed a dedicated social graph repository approach
separate from core user repositories.

The design uses query-oriented database access where graph queries need
specialized SQL.

The backend should keep:

``` text
Core User Repository
```

separate from:

``` text
Social Graph Repository
```

Do not force graph-heavy queries through generic user CRUD repositories.

------------------------------------------------------------------------

# 21. Phase 40.43 --- Feed Backend

## Objective

Build the feed system.

Feed filters already established for the broader Nexus product include:

-   Latest
-   Following
-   Communities
-   News
-   Local
-   Trending
-   AI Recommended

The backend must eventually support authorization-aware feed generation.

The feed architecture must be designed with scale in mind.

Avoid building a naive query that joins every social relationship for
every request.

------------------------------------------------------------------------

# 22. Phase 40.44 --- Authentication and Session Hardening

The project has an authentication architecture involving server-side
session/token state and invalidation.

The backend must provide:

-   login
-   refresh/session handling
-   logout
-   invalidation
-   authorization
-   RBAC
-   secure WebSocket authentication

The exact endpoint list and token/session schema should follow the
already implemented authentication module.

Do not replace the authentication architecture without explicitly
revisiting the locked decision.

------------------------------------------------------------------------

# 23. Phase 40.45 --- Advanced RBAC / Permission Optimization

The server permission system is already used by messaging.

The system must remain consistent across:

-   HTTP
-   WebSocket
-   server
-   channel
-   messaging

Permission checks should remain centralized rather than duplicated
across gateways.

Example:

``` text
Gateway
 ↓
Permission Service
 ↓
Server / Channel permission resolution
```

------------------------------------------------------------------------

# 24. Phase 40.46 --- Security Hardening

## Objective

Move from feature security to platform security.

Areas:

-   input validation
-   rate limiting
-   abuse prevention
-   authorization
-   session invalidation
-   WebSocket authentication
-   permission escalation prevention
-   payload limits
-   replay considerations
-   audit logging
-   secure file access
-   secret management
-   production headers
-   dependency auditing

Never trust client-provided authorization state.

------------------------------------------------------------------------

# 25. Phase 40.47 --- Private E2EE Messaging Foundation

## LOCKED PRODUCT DIRECTION

Nexus messaging is a hybrid system.

It is not one single messaging architecture.

The planned conversation types are:

1.  cloud-based community/server channels
2.  standard cloud-backed direct messages
3.  private E2EE direct messages using the Signal Protocol
4.  secret/private groups

### Important distinction

Normal server/community messaging remains server-controlled and
cloud-backed.

Private E2EE messaging is a separate security model.

The server should not receive plaintext private message content.

------------------------------------------------------------------------

# 26. Signal-Style E2EE Architecture

The project explicitly discussed Signal-style private messaging.

The backend should support the server-side components required by a
Signal-style protocol:

-   identity public keys
-   signed prekeys
-   one-time prekeys
-   device identity
-   device registration
-   key distribution
-   encrypted message envelopes
-   encrypted attachments
-   session establishment metadata
-   device management

The actual cryptographic implementation should use a mature, audited
Signal Protocol implementation/library rather than inventing
cryptography.

The exact library/version is \[UNKNOWN\] and must be selected before
implementation.

------------------------------------------------------------------------

# 27. E2EE Security Boundary

For private E2EE messages:

``` text
Sender device
   |
   | encrypt locally
   ↓
Ciphertext
   |
   ↓
Nexus backend
   |
   | stores/relays ciphertext
   ↓
Recipient device
   |
   | decrypt locally
   ↓
Plaintext
```

The backend should not need plaintext private-message content.

This is intentionally different from normal server channels.

------------------------------------------------------------------------

# 28. Telegram-Style Comparison

Telegram-style concepts were discussed as a comparison point.

Nexus should not blindly copy Telegram's security model.

The important distinction is:

-   normal cloud messaging can be server-readable
-   private E2EE messaging must use end-to-end encryption
-   Signal-style architecture is the intended model for Nexus private
    E2EE

The exact UX/product distinction between normal DM and private E2EE DM
should be finalized before frontend implementation of those flows.

------------------------------------------------------------------------

# 29. Secret Groups

Secret groups are intended to extend the private/E2EE model to multiple
participants.

This should not be implemented as ordinary server channels with a
"secret" flag.

It requires a separate cryptographic/group-key architecture.

The exact group protocol and key-management strategy are \[UNKNOWN\].

Do not implement ad-hoc encryption.

------------------------------------------------------------------------

# 30. Phase 40.48 --- E2EE Device and Key Management

Before actual encrypted messaging, implement:

``` text
User
 ↓
Device
 ↓
Identity Key
 ↓
Signed Prekey
 ↓
One-Time Prekeys
```

Backend responsibilities:

-   register device
-   publish public key material
-   consume one-time prekeys safely
-   rotate keys
-   revoke devices
-   expose recipient public key bundles
-   protect private keys by never receiving them

Private keys should remain on user devices.

------------------------------------------------------------------------

# 31. Phase 40.49 --- E2EE Message Transport

Implement encrypted message envelopes.

The backend transports:

``` text
sender device
recipient/device routing metadata
ciphertext
message identifier
timestamps
delivery metadata
```

The backend should not depend on plaintext message validation for E2EE
content.

This means ordinary server-message validation and E2EE-message
validation must remain separate.

------------------------------------------------------------------------

# 32. Phase 40.50 --- E2EE Attachments

For encrypted attachments:

``` text
file
 ↓
client-side encryption
 ↓
encrypted object
 ↓
R2/object storage
 ↓
encrypted attachment metadata
```

The backend must authorize access without needing plaintext file
content.

------------------------------------------------------------------------

# 33. Phase 40.51 --- E2EE Multi-Device Support

Support:

-   multiple devices per user
-   device verification
-   device revocation
-   session/key rotation
-   encrypted delivery to active devices

This is required for a serious Signal-style messaging system.

------------------------------------------------------------------------

# 34. Phase 40.52 --- Messaging Reliability

Build:

-   message IDs
-   idempotency
-   duplicate detection
-   retry-safe processing
-   delivery acknowledgements
-   reconnect synchronization

WebSocket delivery should not be treated as guaranteed persistence.

Durable state must be persisted first.

------------------------------------------------------------------------

# 35. Phase 40.53 --- Event Ordering

Define message/event ordering rules.

Important areas:

-   message creation order
-   edits
-   deletes
-   pin/unpin
-   reactions
-   reconnect replay
-   multi-instance delivery

Use server-generated timestamps/IDs and durable persistence to establish
authoritative order.

------------------------------------------------------------------------

# 36. Phase 40.54 --- Redis Infrastructure Completion

The Redis layer should eventually provide reusable primitives such as:

-   get
-   set
-   delete
-   exists
-   increment
-   expiration
-   atomic operations where required

Redis usage should remain behind application services where practical.

Do not let every module directly manipulate raw Redis clients.

------------------------------------------------------------------------

# 37. Phase 40.55 --- Observability

Introduce production observability.

Areas:

-   structured logs
-   request IDs
-   WebSocket connection IDs
-   error tracking
-   metrics
-   Redis metrics
-   database metrics
-   WebSocket throughput
-   rate-limit metrics
-   message processing latency

The project already has a logger module.

Continue using centralized logging instead of scattered console logging
in production code.

------------------------------------------------------------------------

# 38. Phase 40.56 --- Backend Performance Engineering

At 1M users, performance work must become measurable.

Measure:

-   API latency
-   WebSocket latency
-   database query latency
-   Redis latency
-   connection counts
-   messages/sec
-   broadcasts/sec
-   CPU
-   memory
-   PostgreSQL connections
-   cache hit rate

Do not optimize based only on intuition.

Use profiling and query plans.

------------------------------------------------------------------------

# 39. Phase 40.57 --- Database Scaling

Future database work may include:

-   connection pooling
-   index tuning
-   partitioning where justified
-   read replicas
-   archival strategies
-   large-table maintenance

Do not introduce partitioning or sharding until actual access patterns
justify it.

------------------------------------------------------------------------

# 40. Phase 40.58 --- Background Jobs

Introduce a background-job layer where asynchronous processing is
needed.

Potential workloads:

-   notifications
-   media processing
-   feed generation
-   search indexing
-   cleanup
-   analytics
-   email/push delivery

The exact queue technology is \[UNKNOWN\].

Do not introduce a queue merely because the project is large; use it
where asynchronous workloads actually require isolation.

------------------------------------------------------------------------

# 41. Phase 40.59 --- API Documentation

Maintain API documentation for:

-   HTTP endpoints
-   WebSocket events
-   DTOs
-   authentication requirements
-   permissions
-   errors

The project has discussed Swagger for HTTP APIs.

WebSocket event documentation should use the same terminology as the
gateway implementation.

------------------------------------------------------------------------

# 42. Phase 40.60 --- Production Readiness

Before frontend integration is considered complete, backend production
readiness should include:

-   environment configuration
-   secret management
-   database migrations
-   health checks
-   graceful shutdown
-   Redis health
-   PostgreSQL health
-   WebSocket readiness
-   structured logs
-   error handling
-   metrics
-   deployment scripts
-   CI/CD
-   rollback strategy

------------------------------------------------------------------------

# 43. Frontend Start Gate

Frontend development should begin only after the backend milestone
agreed for the project is complete.

The frontend should consume the completed backend rather than forcing
backend redesign during UI development.

Frontend implementation order previously established:

1.  authentication
2.  servers
3.  roles
4.  members
5.  channels
6.  invites
7.  messaging
8.  later modules

The backend therefore needs stable contracts for those areas before
frontend work begins.

------------------------------------------------------------------------

# 44. Backend-to-Frontend Contract Rule

Before frontend implementation of a module:

``` text
Backend feature
    ↓
DTO
    ↓
API/WebSocket contract
    ↓
Validation
    ↓
Authorization
    ↓
Error contract
    ↓
Tests
    ↓
Frontend integration
```

Do not build frontend screens against imaginary APIs.

------------------------------------------------------------------------

# 45. Recommended Implementation Order From Current Point

The immediate sequence is:

``` text
40.28.9
Gateway-Wide WebSocket Validation — DONE
        ↓
40.29
WebSocket Security Completion — DONE
        ↓
40.30
Messaging Integration Tests — DONE
        ↓
40.31
Message History + Cursor Pagination — DONE
        ↓
40.32
Message Query Optimization — DONE (merged numbering)
        ↓
40.33
Reply/Thread Queries — DONE (merged numbering)
        ↓
40.34
Message Edit History — DONE (merged numbering)
        ↓
40.35
Message Delete Semantics — DONE (merged numbering)
        ↓
40.36
Mentions — DONE (merged numbering)
        ↓
40.37
Read / Unread State — NEXT (merged numbering)
        ↓
40.33
Message Search
        ↓
40.34
Read/Delivery State
        ↓
40.35
Presence
        ↓
40.36
Notifications
        ↓
40.37
Attachments
        ↓
40.38
Moderation/Audit
        ↓
40.39
Messaging Performance
        ↓
40.40
Distributed WebSocket Scaling
        ↓
40.41
Server Module Completion
        ↓
40.42
Social Graph
        ↓
40.43
Feed
        ↓
40.44
Authentication/Session Hardening
        ↓
40.45
RBAC Optimization
        ↓
40.46
Advanced Security
        ↓
40.47+
Signal-style E2EE foundation
        ↓
E2EE device/key management
        ↓
E2EE message transport
        ↓
E2EE attachments
        ↓
multi-device E2EE
        ↓
reliability/order/observability
        ↓
production readiness
        ↓
FRONTEND START GATE
```

------------------------------------------------------------------------

# 46. How To Work on Every Lecture

Every lecture should follow this structure.

## 1. What

State exactly what is being implemented.

## 2. Why

Explain the architectural/business reason.

## 3. Where

Give exact file and folder paths.

## 4. How

Explain the flow before code.

## 5. Implementation

Provide only the code required for that lecture.

## 6. Integration

Explain how it connects to existing services/repositories/gateways.

## 7. Security

Explain authentication, authorization, validation and abuse risks.

## 8. Testing

Provide exact commands and test cases.

## 9. Git checkpoint

Create a focused commit.

Example:

``` text
git add .
git commit -m "feat(messages): add gateway-wide websocket validation"
```

Do not combine unrelated features into one commit.

------------------------------------------------------------------------

# 47. One-Million-User Engineering Rules

The project is being designed with 1M users in mind.

This does **not** mean prematurely building a distributed system
everywhere.

Use the following principles:

### PostgreSQL

Source of truth for durable relational data.

### Redis

Use for:

-   rate limits
-   cache
-   ephemeral presence
-   distributed coordination
-   real-time fan-out infrastructure where appropriate

### WebSockets

Use for:

-   real-time events
-   room delivery
-   presence
-   message delivery

Do not treat WebSocket delivery as persistence.

### Object storage

Use for:

-   media
-   attachments
-   large binary content

Do not put large files into PostgreSQL.

### Indexes

Every high-frequency query must have a deliberate indexing strategy.

### Pagination

Prefer cursor pagination for large feeds and message history.

### Authorization

Filter data by permission before returning it.

### Idempotency

Mutations that can be retried must be designed to avoid accidental
duplicates.

### Observability

Measure before optimizing.

------------------------------------------------------------------------

# 48. Current Critical Technical Issue — RESOLVED

The most recent concrete error encountered during WebSocket rate-limit
implementation was:

``` text
'"@nestjs/common"' has no exported member named 'TooManyRequestsException'.
```

The current NestJS version in the project is:

``` text
@nestjs/common 11.1.27
```

Resolution: the rate limiter throws a recursive `HttpException` with
`HttpStatus.TOO_MANY_REQUESTS` instead of the nonexistent exception
class.

------------------------------------------------------------------------

# 49. Known Redis Gap — RESOLVED

The current Redis service exposes:

``` text
get
set
del
exists
incr
expire
getClient
```

The WebSocket rate limiter uses `incr` and `expire` directly through the
service abstraction (no callers reach into the raw client for these
operations).

The exact implementation preserves the existing Redis service
abstraction.

------------------------------------------------------------------------

# 50. Current Known Facts vs Unknowns

Known:

-   NestJS backend
-   Prisma
-   PostgreSQL
-   Redis
-   WebSockets
-   class-validator
-   class-transformer
-   repository pattern
-   command/query separation
-   RBAC/permissions
-   messaging module
-   WebSocket DTO layer
-   custom WebSocket validation pipe
-   hybrid messaging architecture
-   Signal-style E2EE direction
-   backend-first workflow

Unknown and must not be guessed:

-   exact final production hosting topology
-   exact Signal Protocol library/version
-   exact E2EE group protocol
-   exact message-read database schema
-   exact audit schema
-   exact queue technology
-   exact production object-storage configuration
-   exact final frontend start date
-   exact final API contract for every module

------------------------------------------------------------------------

# 51. Definition of Backend Completion

Backend should not be considered complete merely because TypeScript
compiles.

A module is complete when:

``` text
Code
+
Database
+
Validation
+
Authorization
+
Error handling
+
Tests
+
WebSocket/HTTP contract
+
Observability where required
+
Documentation
+
Git checkpoint
```

are all addressed.

------------------------------------------------------------------------

# 52. Current Working Rule

Continue from the current lecture.

Do not restart earlier messaging implementation unless a concrete bug
requires it.

Do not redesign the architecture without an explicit reason.

Do not introduce frontend work yet.

The immediate engineering objective is to finish and verify the secure,
scalable Messaging backend, then continue through the remaining backend
modules in dependency order.
