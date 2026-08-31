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

**40.67 --- Double Ratchet (Completed)**

The immediate continuation point is now:

``` text
40.67 Completed → verify → 40.68 E2EE Message Transport
```

The authoritative position is `PROJECT_DETAIL.md` §4. This file's middle
sections are historical. The messaging/realtime series through 40.54,
the Redis/DB/architecture formalization (40.55–40.60), the Redis
WebSocket adapter (40.61), the Direct Message Domain (40.62), and the
E2EE track through 40.67 are complete with a green automated test suite.

------------------------------------------------------------------------

## Completed

### Core backend foundation

Previously implemented/discussed backend infrastructure includes:

-   NestJS application
-   Prisma
-   PostgreSQL
-   Redis
-   configuration module
-   logger module
-   Swagger
-   global validation
-   global exception handling
-   authentication foundation
-   JWT/refresh-token direction
-   RBAC/permission system
-   modular backend structure

The project uses a domain/module-oriented structure with shared
infrastructure under `common`/`core` and business domains under
`modules`.

------------------------------------------------------------------------

## Messaging module completed so far

The Messaging backend has progressed through the WebSocket message
lifecycle.

Implemented/discussed:

1.  Channel message validation
2.  Channel message creation
3.  `send-message` WebSocket event
4.  Room-based message broadcasting
5.  Update/edit message WebSocket event
6.  Delete message WebSocket event
7.  Pin message WebSocket event
8.  Unpin message WebSocket event
9.  Add reaction WebSocket event
10. Remove reaction WebSocket event
11. `ChannelMessageReactionQueryService`
12. Reaction query WebSocket events
13. Broadcast reaction events to channel rooms
14. WebSocket authentication hardening
15. WebSocket authorization hardening
16. WebSocket rate limiting / message spam protection
17. WebSocket DTO layer
18. Custom WebSocket validation pipe
19. Gateway-wide WebSocket validation
20. WebSocket error normalization and contract
21. Redis-backed WebSocket rate limiting (`incr`/`expire`)
22. Messaging unit + integration/security test scaffolding
23. Cursor-based message pagination (channel history + replies)
24. Message Query Optimization (composite indexes + batched reaction counts)
25. Composed thread read model (parent anchor + enriched bounded replies)
26. Non-destructive edit history (transactional snapshot trail + history route)
27. Tombstone delete semantics (deleted content suppressed; thread-parent tombstones)

------------------------------------------------------------------------

# Current WebSocket DTO Layer

Location:

``` text
src/modules/messages/dto/websocket/
```

Current DTO files:

``` text
send-channel-message.request.ts
update-channel-message.request.ts
delete-channel-message.request.ts
pin-channel-message.request.ts
unpin-channel-message.request.ts
add-message-reaction.request.ts
remove-message-reaction.request.ts
```

The project has introduced DTO validation using:

-   `class-validator`
-   `class-transformer`

------------------------------------------------------------------------

# Current WebSocket Validation Pipe

Location:

``` text
src/common/
```

The project currently has a custom:

``` text
WebSocketValidationPipe
```

It uses:

``` text
plainToInstance()
validate()
```

with:

``` text
whitelist: true
forbidNonWhitelisted: true
```

Therefore WebSocket payloads are intended to:

-   be transformed into DTO instances
-   reject invalid fields
-   reject unknown properties
-   enforce DTO decorators

The pipe currently returns:

``` text
BadRequestException('Invalid WebSocket payload.')
```

when validation fails.

------------------------------------------------------------------------

# Current Gateway Security Model

The WebSocket gateway is intended to enforce the following sequence:

``` text
WebSocket connection
        ↓
Authentication
        ↓
Authenticated user identity
        ↓
DTO validation
        ↓
Channel/server membership validation
        ↓
Permission validation
        ↓
Rate limiting
        ↓
Command service
        ↓
Database persistence
        ↓
Broadcast to authorized room
```

The gateway must not trust a client-supplied user ID.

The authenticated user ID comes from:

``` text
client.data.userId
```

------------------------------------------------------------------------

# Current Messaging Architecture

Messaging follows command/query separation.

### Command services

Used for mutations such as:

-   create message
-   update message
-   delete message
-   pin/unpin
-   add/remove reaction

### Query services

Used for:

-   fetching messages
-   fetching reaction data
-   reading message state

### Repository layer

Repositories encapsulate Prisma/database access.

Conceptual flow:

``` text
Gateway
   ↓
Command / Query Service
   ↓
Validation
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

------------------------------------------------------------------------

# Important Messaging Validation

The channel message validation service includes rules such as:

-   message cannot be empty
-   message length is limited to 4000 characters
-   parent/reply target must exist
-   channel/member access must be validated
-   message editing requires author ownership or `MANAGE_MESSAGES`
-   message deletion requires author ownership or `MANAGE_MESSAGES`
-   pinning requires `MANAGE_MESSAGES`
-   channel access requires appropriate server permission

The project has also encountered and corrected argument-order mistakes
around:

``` text
ServerPermissionService.hasPermission()
```

The current signature is:

``` text
hasPermission(
  serverId: string,
  userId: string,
  permission: ServerPermission,
  channelId?: string,
)
```

Any future calls must preserve this order.

------------------------------------------------------------------------

# Current Reaction System

The reaction system includes:

``` text
ChannelMessageReactionRepository
ChannelMessageReactionCommandService
ChannelMessageReactionQueryService
```

and WebSocket events for:

``` text
add-reaction
remove-reaction
```

Reaction events are broadcast to channel rooms.

The Prisma reaction model uses `memberId`, not `userId`, for the
reaction relationship.

This caused previous TypeScript errors where code incorrectly attempted:

``` text
userId
```

instead of:

``` text
memberId
```

The generated Prisma unique key is based on:

``` text
messageId_memberId_emoji
```

not:

``` text
messageId_userId_emoji
```

This has already been corrected.

------------------------------------------------------------------------

# Current Redis Service

The shown Redis service uses the Node `redis` package and exposes:

``` text
getClient()
get()
set()
del()
exists()
incr()
expire()
```

Redis is intended for:

-   rate limiting
-   ephemeral state
-   presence
-   distributed coordination
-   future WebSocket scaling infrastructure

Redis is **not** the durable source of truth for messages.

PostgreSQL remains the durable database.

------------------------------------------------------------------------

# Current Rate-Limit Work

Completed. **40.26 --- WebSocket Rate Limiting & Message Spam
Protection** is implemented and applied to all mutation events.

The `send-message` gateway flow uses a rate-limit operation conceptually
like:

``` text
ws:send-message:{userId}
```

with:

``` text
limit: 20
windowSeconds: 10
```

The `RedisService` now exposes `incr()` and `expire()`, and
`WebSocketRateLimitService.consume()` uses them:

``` text
current = redis.incr(key)
if (current === 1) redis.expire(key, windowSeconds)
if (current > limit) throw HttpException(429)
```

------------------------------------------------------------------------

# Current Rate-Limit Blocker

The project encountered:

``` text
'"@nestjs/common"' has no exported member named 'TooManyRequestsException'.
```

The installed NestJS version shown in the project is:

``` text
@nestjs/common 11.1.27
```

The rate-limit implementation must therefore use an exception strategy
supported by the installed NestJS version.

Do not blindly import `TooManyRequestsException`.

------------------------------------------------------------------------

# Current Dependency-Injection History

The project previously encountered NestJS dependency-resolution problems
around:

``` text
ChannelMessageGateway
```

and:

``` text
ChannelMessageReactionCommandService
```

The general resolution involved:

-   correct provider registration
-   correct module registration
-   correct runtime imports
-   avoiding incorrect `import type` usage for injectable classes
-   using `forwardRef()` where the actual dependency graph requires it

A particularly important previous problem was:

``` text
Nest can't resolve dependencies of the ChannelMessageReactionCommandService
(ChannelMessageReactionRepository, ...)
```

The repository had to be registered as a provider in `MessagesModule`.

------------------------------------------------------------------------

# Current Repository Naming Warning

A previous accidental replacement renamed:

``` text
ChannelMessageRepository
```

to:

``` text
ChannelMessageReactionRepository
```

inside the message repository file.

This broke imports in:

``` text
messages.module.ts
channel-message-command.service.ts
channel-message-query.service.ts
channel-message-validation.service.ts
```

The distinction must remain clear:

``` text
ChannelMessageRepository
```

handles messages.

``` text
ChannelMessageReactionRepository
```

handles reactions.

Do not merge these responsibilities.

------------------------------------------------------------------------

# Current Prisma State

Prisma version encountered:

``` text
Prisma CLI 6.16
```

The project has PostgreSQL as the database.

The reaction schema required explicit opposite relation fields for
Prisma validation.

Previous Prisma errors involved:

``` text
User.messageReactions
ChannelMessageReaction.member
ServerMember
```

The final generated client expects the reaction relationship to use the
server member relationship and the generated composite unique key:

``` text
messageId_memberId_emoji
```

------------------------------------------------------------------------

# Current Exact Pause Point

The latest roadmap position is:

``` text
40.67 — Double Ratchet (Completed)
```

`src/modules/e2ee-ratchet/` implements the ratchet layer over the 40.66
sessions: symmetric KDF chains (HKDF/HMAC-SHA256), X25519 DH ratchet
step, AES-256-GCM message encryption, skipped-message-key cache for
out-of-order delivery, first-contact DH adoption, and an explicit
ratchet-step surface. State persists in `E2eeRatchetState` (migration
`20260831000003_add_e2ee_ratchet_state`). Verification: tsc clean,
84 Jest suites / 536 tests green, `nest build` ok.

The next objective is **40.68 --- E2EE Message Transport**, which must
begin with the `@signalapp/libsignal` ADR spike (see
`docs/e2ee/04-library-selection.md` §5).

--------

# Current Task

## 40.67 --- Double Ratchet (Completed)

Implemented:

-   **symmetric-chain ratchet** — per-message message keys derived from
    chain keys via HMAC-SHA256; chains advance and persist on every
    encrypt/decrypt
-   **DH ratchet step** — real X25519 ECDH against the remote DH public
    rekeys the root (HKDF-SHA256) and both chains; counters reset;
    triggered inline on a changed remote key or explicitly via
    `POST /e2ee/ratchet/step`
-   **message encryption** — AES-256-GCM under per-message keys, header
    bound as AAD, `iv||tag||data` envelope
-   **skipped message keys** — out-of-order delivery supported via a
    capped (1000) cache keyed by `(remoteDhPublic, messageNumber)`
-   **bootstrap** — ratchet state bootstraps from the 40.66 session
    (`E2eeSession.sessionState`), one state row per session; bootstrap
    chains are symmetric until the real X3DH-derived asymmetric
    bootstrap arrives with the Signal library (40.68)
-   out of scope (documented, not built) — asymmetric per-side bootstrap
    from real X3DH output, sealed sender, on-device ratchet custody
    (server-orchestrated scaffold until the library lands)

Verification: `Found 0 errors` (tsc), 84 Jest suites / 536 tests
passing (11 new in `e2ee-ratchet-command.service.spec`), `nest build`
succeeds.

## Next ---- 40.68 E2EE Message Transport

------------------------------------------------------------------------

# What Must Be Verified Now

### 1. Gateway-level pipe

Confirm whether the gateway has a validation pipe applied at gateway
scope.

The desired architectural result is:

``` text
@WebSocketGateway(...)
@UsePipes(WebSocketValidationPipe)
export class ChannelMessageGateway
```

If the existing code already applies validation differently, inspect the
actual file before changing it.

------------------------------------------------------------------------

### 2. DTO metadata

Every `@MessageBody()` payload should resolve to its DTO class.

For example:

``` text
SendChannelMessageRequest
```

must not be replaced with:

``` text
any
```

or a plain object type.

------------------------------------------------------------------------

### 3. Unknown fields

Payloads containing unexpected fields must fail.

Example:

``` json
{
  "channelId": "...",
  "content": "hello",
  "unexpectedField": "attack"
}
```

should be rejected because:

``` text
forbidNonWhitelisted: true
```

is enabled.

------------------------------------------------------------------------

### 4. Invalid UUIDs

DTOs using `@IsUUID()` must reject malformed IDs.

------------------------------------------------------------------------

### 5. Message length

The send-message DTO must enforce the 4000-character limit.

------------------------------------------------------------------------

### 6. Optional parent message

`parentMessageId` must remain optional but, when supplied, must be a
valid UUID and must subsequently pass the existing parent-message
existence validation.

------------------------------------------------------------------------

# Next Lecture

After 40.37 is fully verified:

## 40.38 --- Typing Indicators

Focus on:

-   ephemeral typing presence per channel: Redis/Socket.IO, debounced and
    throttled — **no DB writes**
-   scope preserved from B2's absence in its plan: this is inserted from
    B1 40.26 / concept §44 at the merged position 40.38
-   keep it distinct from presence (40.40) and message delivery state
    (40.39)

Do not jump directly into unrelated frontend work.

------------------------------------------------------------------------

# Next Major Phase

After WebSocket security is stable:

## 40.30 --- Messaging Integration Tests

The goal is to verify the complete pipeline:

``` text
WebSocket
→ authentication
→ DTO validation
→ authorization
→ command service
→ repository
→ PostgreSQL
→ broadcast
```

Test both success and failure paths.

------------------------------------------------------------------------

# Planned Messaging Sequence After Security

The current backend roadmap continues approximately in this order:

``` text
40.28.9
Gateway-Wide WebSocket Validation
        ↓
40.29
WebSocket Security Completion
        ↓
40.30
Messaging Integration Tests
        ↓
40.31
Message History + Cursor Pagination
        ↓
40.32
Reply / Thread Queries
        ↓
40.33
Message Search
        ↓
40.34
Read / Delivery State
        ↓
40.35
Presence
        ↓
40.36
Notifications
        ↓
40.37
Message Attachments
        ↓
40.38
Moderation / Audit
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
Authentication / Session Hardening
        ↓
40.45
RBAC Optimization
        ↓
40.46
Advanced Security
        ↓
40.47+
Signal-style E2EE foundation
```

------------------------------------------------------------------------

# Hybrid Messaging Decision

Nexus uses a hybrid messaging architecture.

The agreed messaging types are:

1.  Cloud-based server/community channels
2.  Standard cloud-backed direct messages
3.  Private E2EE direct messages using the Signal Protocol
4.  Secret/private groups

These are intentionally different security models.

Normal server/community messaging is cloud-backed and server-controlled.

Private E2EE messaging is intended to use a Signal-style cryptographic
architecture.

The backend must not receive plaintext private E2EE message content.

------------------------------------------------------------------------

# E2EE Future Work

E2EE is planned after the core backend foundations are sufficiently
stable.

Future E2EE phases include:

-   device registration
-   identity public keys
-   signed prekeys
-   one-time prekeys
-   key bundles
-   encrypted message envelopes
-   encrypted attachments
-   device revocation
-   multi-device support
-   private group encryption

The exact Signal Protocol library/version is:

``` text
[UNKNOWN]
```

The exact secret-group cryptographic protocol is:

``` text
[UNKNOWN]
```

Do not invent cryptographic primitives or create an ad-hoc replacement
for Signal Protocol.

------------------------------------------------------------------------

# Frontend Status

Frontend development has **not started as the active development
phase**.

The agreed development strategy is backend-first.

Frontend should begin after the agreed backend milestone is complete and
the relevant backend contracts are stable.

Previously established frontend implementation order:

``` text
Authentication
→ Servers
→ Roles
→ Members
→ Channels
→ Invites
→ Messaging
→ Later modules
```

Do not start frontend implementation prematurely unless the project
owner explicitly changes the backend-first decision.

------------------------------------------------------------------------

# Current Known Blockers / Open Questions

## Blocker 1 --- Redis rate limiter — RESOLVED

`RedisService` now exposes:

``` text
incr()
expire()
```

and `WebSocketRateLimitService.consume()` uses them (see "Current
Rate-Limit Work" above).

## Blocker 2 --- Rate-limit exception — RESOLVED

`TooManyRequestsException` is not exported by the installed NestJS
version. The implementation throws:

``` text
HttpException('/"Too many requests./"', HttpStatus.TOO_MANY_REQUESTS)
```

## Open Question 3 --- Exact gateway-wide pipe placement

`WebSocketValidationPipe` is applied at gateway class level:

``` text
@UsePipes(WebSocketValidationPipe)
```

## Open Question 4 --- Tests — PARTIALLY RESOLVED

Automated messaging unit/integration scaffolding now exists (9 Jest
suites, 37 tests) covering pagination, validation, rate limiting,
repository queries, controller behavior, and gateway flows. Database
backed end-to-end tests are still [UNKNOWN/not established].

## Open Question 5 --- E2EE library

Signal Protocol implementation library/version:

``` text
[UNKNOWN]
```

## Open Question 6 --- Production infrastructure

Exact final production deployment topology:

``` text
[UNKNOWN]
```

------------------------------------------------------------------------

# Commands Previously Used

The project has repeatedly used:

``` text
pnpm start:dev
```

The NestJS watcher has been used to catch TypeScript compilation errors.

A successful state has previously shown:

``` text
Found 0 errors.
```

------------------------------------------------------------------------

# Required Continuation Workflow

For every next lecture:

1.  Explain what is being built.
2.  Explain why it belongs at this point.
3.  Show the exact folder/file path.
4.  Inspect existing code before modifying it.
5.  Explain integration with existing services.
6.  Implement only the current lecture.
7.  Compile with:

``` text
pnpm start:dev
```

8.  Fix only errors caused by the current implementation.
9.  Test the behavior.
10. Create a focused Git commit.

Do not generate the entire remaining project in one step.

------------------------------------------------------------------------

# Git Checkpoint

The project uses focused commits for implementation milestones.

The exact latest commit hash is:

``` text
[UNKNOWN]
```

The next commit should describe the actual completed change rather than
claiming completion before testing.

------------------------------------------------------------------------

# Important Rules for the Next AI

-   Read the project's roadmap/status before continuing.
-   Treat locked architecture decisions as fixed.
-   Do not invent missing code.
-   Ask for the current file when the exact implementation is unknown.
-   Keep message command/query responsibilities separate.
-   Keep message and reaction repositories separate.
-   Keep Redis as an infrastructure/ephemeral layer, not durable message
    storage.
-   Never trust client-supplied identity or permissions.
-   Validate WebSocket DTOs before executing commands.
-   Authorize channel access before message operations.
-   Preserve the backend-first workflow.
-   Do not begin frontend implementation unless the backend start gate
    has been reached or explicitly changed.
-   Never expose or store secrets, tokens, passwords, or `.env` values.

------------------------------------------------------------------------

# Immediate Continuation

## Completed

-   Messaging WebSocket event foundation
-   message CRUD events
-   pin/unpin events
-   reaction events
-   reaction query service
-   reaction broadcasting
-   WebSocket authentication/authorization hardening work
-   rate-limit/spam-protection work (Redis `incr`/`expire`)
-   WebSocket DTO layer
-   custom WebSocket validation pipe
-   gateway-wide validation
-   WebSocket error normalization and contract
-   messaging unit + integration test scaffolding
-   **40.31 --- cursor-based message pagination**
-   **40.32 --- message query optimization** (composite indexes + batched
    reaction counts)
-   **40.33 --- composed thread read model** (parent anchor + enriched
    bounded replies)
-   **40.34 --- non-destructive edit history** (transactional snapshot
    trail + history route)
-   **40.35 --- tombstone delete semantics** (deleted content suppressed;
    thread-parent tombstones)
-   **40.36 --- mentions** (parsing, authorization, anti-abuse cap,
    indexed mention records; write-path persistence + read-path
    enrichment)
-   **40.37 --- read / unread state** (per-channel moving cursor with
    forward-only semantics; derived unread count; no Redis)
-   **40.38 --- typing indicators** (ephemeral Redis presence with expiry,
    throttled `typing-start`/`typing-stop`, per-channel broadcast
    excluding the sender)
-   **40.39 --- message delivery state** (explicit `created` ack contract;
    `message-read` fan-out via the 40.37 cursor; broadcast never treated
    as read)

## Current task

**40.40 --- Presence Foundation** (next lecture)

## Where we paused

After committing 40.39 (message delivery state) with a green test suite
(17 suites / 112 tests).

## Blockers

-   none blocking from the previous lecture
-   database-backed end-to-end test coverage is still pending

## Next task

**40.40 --- Presence Foundation.**

## First next step

Inspect where presence (online / idle / offline / dnd / last seen)
belongs:

``` text
src/modules/messages/gateways/channel-message.gateway.ts
src/core/redis/redis.service.ts
src/modules/servers/services/server-member-query.service.ts
```

and confirm:

1.  which WS lifecycle hook presence state should be driven from
2.  how Redis presence keys (`user:{id}:presence`) compose with the
    typing presence keys and the existing rate-limit Redis usage
3.  what the presence query/broadcast contract should be without touching
    PostgreSQL on every heartbeat

Only then make the smallest required code change for 40.40.
