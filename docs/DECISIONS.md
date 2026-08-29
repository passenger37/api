# Nexus --- DECISIONS.md

> Decision log for the Nexus project. Decisions explicitly agreed during
> the project are marked **LOCKED**. Missing information is marked
> **\[UNKNOWN\]** and must not be guessed.

------------------------------------------------------------------------

## DEC-001: Backend-First Development

-   Status: LOCKED
-   Decision: Develop the Nexus backend first and continue backend
    implementation through the major Messaging backend milestone before
    beginning frontend development.
-   Reason: The frontend should be built against completed and stable
    backend capabilities rather than forcing backend/frontend
    development to proceed simultaneously.
-   Alternatives considered: Starting frontend earlier; developing
    frontend and backend in parallel.
-   Why alternatives were rejected: The project owner explicitly chose a
    backend-first workflow to finish the Messaging backend before
    frontend implementation.
-   Consequences: Backend contracts, authorization, messaging, WebSocket
    behavior, and security are established before frontend work.
-   Related files/modules: `src/modules/messages/`, backend roadmap,
    frontend implementation plan.
-   Date or conversation stage: Project architecture/roadmap
    discussions.

------------------------------------------------------------------------

## DEC-002: Servers Are the Primary Community Unit

-   Status: LOCKED
-   Decision: Nexus uses Discord-style **Servers** as the primary
    collaboration/community abstraction.
-   Reason: Servers provide a stronger collaboration model around
    channels, categories, roles, permissions, members, invites,
    announcements, events, and future voice/live functionality.
-   Alternatives considered: Making Reddit-style Communities the primary
    abstraction.
-   Why alternatives were rejected: The project owner preferred
    Discord-style Servers.
-   Consequences: Server membership, roles, permissions, channels, and
    invites form a major part of the backend architecture.
-   Related files/modules: Server module, Messaging module.
-   Date or conversation stage: Nexus product architecture discussions.

------------------------------------------------------------------------

## DEC-003: Hybrid Messaging Architecture

-   Status: LOCKED
-   Decision: Nexus uses a hybrid messaging architecture with four broad
    messaging modes:
    1.  Cloud-based server/community channels
    2.  Standard cloud-backed direct messages
    3.  Private E2EE direct messages using a Signal-style protocol
    4.  Secret/private groups
-   Reason: Different communication scenarios require different
    persistence, privacy, moderation, and cryptographic properties.
-   Alternatives considered: One universal cloud messaging model; making
    all messaging E2EE.
-   Why alternatives were rejected: Server/community messaging requires
    server-side functionality, while private conversations require
    stronger privacy.
-   Consequences: Messaging cannot be implemented as one security model.
    Cloud messages and private E2EE messages require different backend
    responsibilities.
-   Related files/modules: Messaging module, future E2EE module.
-   Date or conversation stage: Messaging architecture discussions.

------------------------------------------------------------------------

## DEC-004: Signal-Style Protocol for Private E2EE Messaging

-   Status: LOCKED
-   Decision: Private E2EE messaging should use a proper Signal-style
    cryptographic architecture rather than custom/ad-hoc encryption.
-   Reason: Private messaging requires established cryptographic design,
    key management, identity verification, and forward-secrecy-style
    properties rather than application-level encryption invented for
    Nexus.
-   Alternatives considered: Custom encryption; simple database
    encryption; WhatsApp/Telegram-style concepts without selecting a
    concrete protocol.
-   Why alternatives were rejected: Custom cryptography is unsafe and
    does not provide a complete secure messaging protocol.
-   Consequences: Future E2EE implementation must be designed around a
    proper Signal-style protocol/library. The exact library/version is
    **\[UNKNOWN\]**.
-   Related files/modules: Future private messaging/E2EE modules.
-   Date or conversation stage: Privacy and messaging architecture
    discussion.

------------------------------------------------------------------------

## DEC-005: PostgreSQL as Primary Durable Database

-   Status: LOCKED
-   Decision: PostgreSQL is the primary durable relational database.
-   Reason: Nexus has relational entities such as users, servers,
    memberships, roles, permissions, channels, messages, reactions, and
    other relationships that benefit from transactions and relational
    integrity.
-   Alternatives considered: MongoDB, SQLite, other databases.
-   Why alternatives were rejected: PostgreSQL was selected as the main
    durable relational system for the project.
-   Consequences: Durable messaging and core relational state are stored
    in PostgreSQL.
-   Related files/modules: Prisma schema, repositories, all relational
    modules.
-   Date or conversation stage: Backend technology selection.

------------------------------------------------------------------------

## DEC-006: Prisma as Database Access Layer

-   Status: LOCKED
-   Decision: Use Prisma as the ORM/data-access layer for PostgreSQL.
-   Reason: Prisma provides typed database access and integrates with
    the TypeScript/NestJS backend.
-   Alternatives considered: TypeORM and other database access
    approaches.
-   Why alternatives were rejected: Prisma was selected for the current
    Nexus backend.
-   Consequences: Repository implementations use Prisma and generated
    Prisma types.
-   Related files/modules: `prisma/schema.prisma`, repositories.
-   Date or conversation stage: Backend technology selection.

------------------------------------------------------------------------

## DEC-007: NestJS Backend

-   Status: LOCKED
-   Decision: Use NestJS with TypeScript for the backend.
-   Reason: NestJS provides dependency injection, modules, controllers,
    WebSocket gateways, guards/pipes/interceptors, and a structure
    appropriate for a large modular backend.
-   Alternatives considered: Express-style Node.js backend and other
    backend frameworks.
-   Why alternatives were rejected: NestJS was selected for the current
    architecture.
-   Consequences: Backend implementation follows NestJS
    module/provider/gateway patterns.
-   Related files/modules: `src/`, all NestJS modules.
-   Date or conversation stage: Backend technology selection.

------------------------------------------------------------------------

## DEC-008: Modular Monolith Before Microservices

-   Status: LOCKED
-   Decision: Build Nexus as a modular monolith rather than immediately
    splitting the application into microservices.
-   Reason: Clear domain boundaries are valuable, but premature
    distributed services would add operational and networking complexity
    before the domains are mature.
-   Alternatives considered: Microservices from the beginning.
-   Why alternatives were rejected: The project is currently focused on
    building coherent domain modules first.
-   Consequences: Business domains remain separated inside the NestJS
    application. Distributed infrastructure can be introduced later
    where justified.
-   Related files/modules: `src/modules/`, `src/common/`, `src/core/`.
-   Date or conversation stage: Backend architecture discussions.

------------------------------------------------------------------------

## DEC-009: Domain-First Module Structure

-   Status: LOCKED
-   Decision: Organize business code around domain/modules with separate
    services, repositories, DTOs, gateways/controllers, and supporting
    types.
-   Reason: Domain ownership makes a large codebase easier to navigate
    and keeps business responsibilities together.
-   Alternatives considered: A purely technical folder structure where
    all services/repositories/controllers are globally grouped.
-   Why alternatives were rejected: Domain-first organization better
    fits Nexus's modular architecture.
-   Consequences: Messaging code stays under `src/modules/messages/`,
    server code under its domain, etc.
-   Related files/modules: `src/modules/`.
-   Date or conversation stage: Backend folder-structure discussions.

------------------------------------------------------------------------

## DEC-010: Common Infrastructure Separation

-   Status: LOCKED
-   Decision: Shared reusable infrastructure belongs in
    common/core/config areas rather than inside individual business
    modules.
-   Reason: Cross-cutting components such as interceptors, validation
    infrastructure, logging, configuration, and reusable WebSocket
    utilities should not belong to one business domain.
-   Alternatives considered: Keeping interceptors and shared
    infrastructure inside individual modules.
-   Why alternatives were rejected: It creates coupling and makes
    reusable infrastructure harder to locate.
-   Consequences: Interceptors were moved into `common/interceptor`, and
    shared infrastructure follows the common/core structure.
-   Related files/modules: `src/common/`, `src/core/`, `src/config/`.
-   Date or conversation stage: Backend structure discussions.

------------------------------------------------------------------------

## DEC-011: Repository Pattern

-   Status: LOCKED
-   Decision: Use repositories to encapsulate database operations.
-   Reason: Services should not directly contain all Prisma/database
    details. Repositories provide a clean data-access boundary and make
    future query optimization easier.
-   Alternatives considered: Direct Prisma calls from every service.
-   Why alternatives were rejected: Direct database access throughout
    services would increase coupling.
-   Consequences: Known repositories include `ChannelMessageRepository`
    and `ChannelMessageReactionRepository`.
-   Related files/modules: `src/modules/messages/repositories/`.
-   Date or conversation stage: Messaging backend implementation.

------------------------------------------------------------------------

## DEC-012: Keep Message and Reaction Repositories Separate

-   Status: LOCKED
-   Decision: `ChannelMessageRepository` and
    `ChannelMessageReactionRepository` remain separate responsibilities.
-   Reason: Messages and reactions have different persistence operations
    and business responsibilities.
-   Alternatives considered: Combining them into one repository.
-   Why alternatives were rejected: It would blur domain
    responsibilities and previously caused naming/import problems.
-   Consequences: Message code imports `ChannelMessageRepository`;
    reaction code imports `ChannelMessageReactionRepository`.
-   Related files/modules:
    -   `src/modules/messages/repositories/channel-message.repository.ts`
    -   `src/modules/messages/repositories/channel-message-reaction.repository.ts`
-   Date or conversation stage: Reaction implementation/debugging.

------------------------------------------------------------------------

## DEC-013: Command / Query Separation in Messaging

-   Status: LOCKED
-   Decision: Messaging uses separate command and query services.
-   Reason: Mutations and reads have different responsibilities and
    scaling/optimization needs.
-   Alternatives considered: One large message service handling reads
    and writes.
-   Why alternatives were rejected: It would make the messaging domain
    harder to reason about and maintain.
-   Consequences: Known services include:
    -   `ChannelMessageCommandService`
    -   `ChannelMessageQueryService`
    -   `ChannelMessageReactionCommandService`
    -   `ChannelMessageReactionQueryService`
-   Related files/modules: `src/modules/messages/services/`.
-   Date or conversation stage: Messaging architecture implementation.

------------------------------------------------------------------------

## DEC-014: WebSocket Real-Time Messaging

-   Status: LOCKED
-   Decision: Use WebSockets for real-time channel messaging.
-   Reason: Messaging requires low-latency bidirectional communication
    and event delivery.
-   Alternatives considered: Polling for every message interaction.
-   Why alternatives were rejected: Polling is inefficient for real-time
    messaging and does not scale as well for interactive delivery.
-   Consequences: `ChannelMessageGateway` handles WebSocket events and
    broadcasts.
-   Related files/modules:
    `src/modules/messages/gateways/channel-message.gateway.ts`.
-   Date or conversation stage: Messaging WebSocket implementation.

------------------------------------------------------------------------

## DEC-015: Room-Based Message Delivery

-   Status: LOCKED
-   Decision: Broadcast message events to channel-specific WebSocket
    rooms.
-   Reason: Only clients interested in a channel should receive that
    channel's events.
-   Alternatives considered: Broadcasting every event to every connected
    client.
-   Why alternatives were rejected: Global broadcasting wastes bandwidth
    and does not scale.
-   Consequences: Message/reaction events are associated with channel
    rooms.
-   Related files/modules: `ChannelMessageGateway`.
-   Date or conversation stage: Lectures 40.15 and 40.22.

------------------------------------------------------------------------

## DEC-016: WebSocket Authentication Uses Server-Side Identity

-   Status: LOCKED
-   Decision: Protected WebSocket handlers use the authenticated
    identity associated with the socket, currently represented by
    `client.data.userId`.
-   Reason: The client must not be able to impersonate another user by
    submitting an arbitrary user ID in the payload.
-   Alternatives considered: Accepting `userId` from each WebSocket
    request body.
-   Why alternatives were rejected: Client-supplied identity is
    untrusted.
-   Consequences: WebSocket DTOs should not be used to establish user
    identity. The gateway obtains the user ID from the authenticated
    socket.
-   Related files/modules: `ChannelMessageGateway`, WebSocket
    authentication.
-   Date or conversation stage: WebSocket security hardening.

------------------------------------------------------------------------

## DEC-017: DTO Validation at the WebSocket Boundary

-   Status: LOCKED
-   Decision: WebSocket request payloads use explicit DTO classes with
    `class-validator` and `class-transformer`.
-   Reason: WebSocket payloads are untrusted input and require
    structural validation before entering business logic.
-   Alternatives considered: `any`, plain objects, manual validation
    inside every handler.
-   Why alternatives were rejected: They increase duplication and make
    validation inconsistent.
-   Consequences: DTOs exist under:
    `src/modules/messages/dto/websocket/`
-   Related files/modules:
    -   `send-channel-message.request.ts`
    -   `update-channel-message.request.ts`
    -   `delete-channel-message.request.ts`
    -   `pin-channel-message.request.ts`
    -   `unpin-channel-message.request.ts`
    -   `add-message-reaction.request.ts`
    -   `remove-message-reaction.request.ts`
-   Date or conversation stage: Lecture 40.28 series.

------------------------------------------------------------------------

## DEC-018: Strict WebSocket Payload Validation

-   Status: LOCKED
-   Decision: The custom `WebSocketValidationPipe` uses:
    -   `whitelist: true`
    -   `forbidNonWhitelisted: true`
-   Reason: Payloads should contain only properties explicitly allowed
    by the DTO.
-   Alternatives considered: Silently stripping unknown fields;
    accepting unknown fields.
-   Why alternatives were rejected: Strict rejection provides stronger
    API contracts and catches client errors/security issues earlier.
-   Consequences: Unknown WebSocket fields should result in validation
    failure.
-   Related files/modules: `WebSocketValidationPipe`, WebSocket DTOs.
-   Date or conversation stage: Lecture 40.28.9.

------------------------------------------------------------------------

## DEC-019: Custom WebSocket Validation Pipe

-   Status: LOCKED
-   Decision: Use a dedicated `WebSocketValidationPipe` rather than
    relying only on HTTP validation behavior.
-   Reason: WebSocket payload handling needs explicit transformation and
    validation behavior appropriate to gateway message bodies.
-   Alternatives considered: No validation pipe; HTTP-only validation
    configuration.
-   Why alternatives were rejected: WebSocket input must be validated
    independently at the transport boundary.
-   Consequences: Incoming payloads are transformed with
    `plainToInstance()` and validated with `class-validator`.
-   Related files/modules: `src/common/` WebSocket validation
    infrastructure.
-   Date or conversation stage: Lecture 40.28.

------------------------------------------------------------------------

## DEC-020: Layered Message Validation

-   Status: LOCKED
-   Decision: Message validation is performed in layers:
    1.  DTO/transport validation
    2.  business validation
    3.  database constraints
-   Reason: Structural correctness, business authorization, and
    relational integrity are separate concerns.
-   Alternatives considered: Relying only on DTO validation; relying
    only on database constraints.
-   Why alternatives were rejected: DTOs cannot determine business
    permissions and database constraints cannot express every business
    rule.
-   Consequences: The validation service continues to check
    channel/member/parent-message/permission rules after DTO validation.
-   Related files/modules: `ChannelMessageValidationService`, DTOs,
    Prisma.
-   Date or conversation stage: Messaging backend implementation.

------------------------------------------------------------------------

## DEC-021: 4000 Character Maximum for Messages

-   Status: LOCKED
-   Decision: Channel message content is limited to 4000 characters.
-   Reason: The limit is part of the current message validation contract
    and protects the system from unnecessarily large message payloads.
-   Alternatives considered: Larger/unlimited message content.
-   Why alternatives were rejected: The project currently uses 4000 as
    the agreed validation limit.
-   Consequences: `SendChannelMessageRequest` uses `@MaxLength(4000)`.
-   Related files/modules: `send-channel-message.request.ts`, message
    validation.
-   Date or conversation stage: Messaging implementation.

------------------------------------------------------------------------

## DEC-022: Message Ownership / MANAGE_MESSAGES Rule

-   Status: LOCKED
-   Decision: A message author can delete their own message. Other users
    require `ServerPermission.MANAGE_MESSAGES`.
-   Reason: Users need control over their own content while
    moderators/managers require authority to manage other messages.
-   Alternatives considered: Requiring `MANAGE_MESSAGES` for every
    deletion; allowing everyone to delete any message.
-   Why alternatives were rejected: Both alternatives violate the
    intended ownership/moderation model.
-   Consequences: `validateDeletePermission()` checks author membership
    first, then checks `MANAGE_MESSAGES`.
-   Related files/modules: `ChannelMessageValidationService`, permission
    service.
-   Date or conversation stage: Messaging authorization implementation.

------------------------------------------------------------------------

## DEC-023: Permission Service Contract

-   Status: LOCKED
-   Decision: The permission service contract is:

``` text
hasPermission(
  serverId: string,
  userId: string,
  permission: ServerPermission,
  channelId?: string,
)
```

-   Reason: Permission evaluation needs server, user, permission, and
    optionally channel context.
-   Alternatives considered: Different argument order or using a user ID
    in the permission parameter position.
-   Why alternatives were rejected: Incorrect argument ordering
    previously caused TypeScript errors.
-   Consequences: Future calls must preserve this parameter order.
-   Related files/modules: Permission service, message validation.
-   Date or conversation stage: Permission debugging.

------------------------------------------------------------------------

## DEC-024: Message Creation Transaction

-   Status: LOCKED
-   Decision: Message creation uses a Prisma transaction around
    repository persistence.
-   Reason: Message creation involves validated relationships and should
    be persisted atomically.
-   Alternatives considered: Multiple independent writes without a
    transaction.
-   Why alternatives were rejected: Partial persistence would be harder
    to reason about.
-   Consequences: `ChannelMessageCommandService.createMessage()` uses
    `prisma.$transaction(...)`.
-   Related files/modules: `ChannelMessageCommandService`,
    `ChannelMessageRepository`.
-   Date or conversation stage: Lecture 40 messaging implementation.

------------------------------------------------------------------------

## DEC-025: Reaction Uses ServerMember Relationship

-   Status: LOCKED
-   Decision: `ChannelMessageReaction` relates to `ServerMember` through
    `memberId`, not directly to `User` through `userId`.
-   Reason: Reactions occur in the context of a server membership, which
    is the authorization/domain relationship already used by the server
    architecture.
-   Alternatives considered: Direct `userId` relationship.
-   Why alternatives were rejected: The Prisma model uses the
    server-member relationship and generated types reflect that.
-   Consequences: Reaction creation and lookup use `memberId`.
-   Related files/modules: `ChannelMessageReaction`,
    `ChannelMessageReactionRepository`.
-   Date or conversation stage: Reaction implementation.

------------------------------------------------------------------------

## DEC-026: Reaction Composite Uniqueness

-   Status: LOCKED
-   Decision: The reaction unique key is based on:

``` text
messageId_memberId_emoji
```

-   Reason: A member should not create duplicate identical emoji
    reactions on the same message.
-   Alternatives considered: `messageId_userId_emoji`.
-   Why alternatives were rejected: The actual Prisma model uses
    `memberId`.
-   Consequences: Repository `findUnique`/delete operations use the
    generated `messageId_memberId_emoji` key.
-   Related files/modules: `ChannelMessageReactionRepository`, Prisma
    schema.
-   Date or conversation stage: Reaction debugging.

------------------------------------------------------------------------

## DEC-027: Redis for Ephemeral/Distributed Infrastructure

-   Status: LOCKED
-   Decision: Redis is used for infrastructure such as rate limiting,
    presence, ephemeral state, and future distributed WebSocket
    coordination.
-   Reason: These workloads require fast shared state rather than
    durable relational storage.
-   Alternatives considered: PostgreSQL for every ephemeral operation.
-   Why alternatives were rejected: Redis is better suited for
    high-frequency transient operations.
-   Consequences: PostgreSQL remains the durable source of truth for
    messages.
-   Related files/modules: `RedisService`, WebSocket rate limiter.
-   Date or conversation stage: Scaling/infrastructure discussions.

------------------------------------------------------------------------

## DEC-028: PostgreSQL Remains Durable Source of Truth

-   Status: LOCKED
-   Decision: Redis must not become the authoritative durable message
    store.
-   Reason: Message persistence requires relational durability and
    transactional integrity.
-   Alternatives considered: Storing message state primarily in Redis.
-   Why alternatives were rejected: Redis is being used as
    infrastructure/ephemeral state, not the durable database.
-   Consequences: Message creation ultimately persists through
    Prisma/PostgreSQL.
-   Related files/modules: Messaging repositories, Prisma, Redis
    infrastructure.
-   Date or conversation stage: Messaging/scaling discussions.

------------------------------------------------------------------------

## DEC-029: WebSocket Rate Limiting

-   Status: LOCKED
-   Decision: WebSocket message sending is rate limited server-side.
-   Reason: A real-time messaging endpoint can be abused for spam,
    flooding, or resource exhaustion.
-   Alternatives considered: Client-side rate limiting only.
-   Why alternatives were rejected: Client-side limits are not security
    controls.
-   Consequences: `send-message` uses a key conceptually like:
    `ws:send-message:{userId}`
-   Related files/modules: `WebSocketRateLimitService`,
    `ChannelMessageGateway`, `RedisService`.
-   Date or conversation stage: Lecture 40.26.

------------------------------------------------------------------------

## DEC-030: WebSocket Authentication and Authorization Hardening

-   Status: LOCKED
-   Decision: WebSocket gateways must authenticate the socket and
    perform server-side authorization before message mutations.
-   Reason: Real-time endpoints are security-sensitive and cannot rely
    only on HTTP authentication or client claims.
-   Alternatives considered: Trusting an authenticated HTTP session
    without WebSocket verification; trusting payload identity.
-   Why alternatives were rejected: WebSocket connections have their own
    lifecycle and must enforce authorization at the gateway/business
    boundary.
-   Consequences: Gateway operations use authenticated socket identity
    plus membership/permission validation.
-   Related files/modules: `ChannelMessageGateway`, WebSocket
    authentication/authorization.
-   Date or conversation stage: Lectures 40.26--40.27.

------------------------------------------------------------------------

## DEC-031: Backend-First Frontend Start Gate

-   Status: LOCKED
-   Decision: Frontend development begins only after the agreed
    backend/Messaging milestone is sufficiently complete and stable.
-   Reason: The frontend should implement real backend contracts rather
    than drive unfinished backend design.
-   Alternatives considered: Starting frontend during Messaging
    implementation.
-   Why alternatives were rejected: The project owner explicitly wants
    backend-first development.
-   Consequences: Current work remains in backend WebSocket
    validation/security hardening.
-   Related files/modules: Backend roadmap and future frontend roadmap.
-   Date or conversation stage: Roadmap discussions.

------------------------------------------------------------------------

## DEC-032: Frontend Implementation Order

-   Status: LOCKED
-   Decision: When frontend begins, the implementation order is:

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

-   Reason: The frontend should follow backend dependency order.
-   Alternatives considered: Building the feed or UI first.
-   Why alternatives were rejected: Core
    identity/server/channel/messaging capabilities are dependencies for
    the rest of the application.
-   Consequences: Frontend work follows completed backend contracts.
-   Related files/modules: Future frontend application.
-   Date or conversation stage: Frontend roadmap discussions.

------------------------------------------------------------------------

## DEC-033: Lecture-Based Incremental Development

-   Status: LOCKED
-   Decision: Develop the backend through small numbered
    lectures/milestones.
-   Reason: The project owner wants a guided implementation process
    where each step explains what, why, where, how, testing, and Git
    checkpoint.
-   Alternatives considered: Generating large portions of the project at
    once.
-   Why alternatives were rejected: Large generated changes are harder
    to understand, verify, and debug.
-   Consequences: Current Messaging work is tracked through lectures
    40.x.
-   Related files/modules: Entire backend roadmap.
-   Date or conversation stage: Project development workflow.

------------------------------------------------------------------------

## DEC-034: Inspect Existing Code Before Refactoring

-   Status: LOCKED
-   Decision: Future implementation should inspect the actual existing
    file/code before proposing structural changes.
-   Reason: Several previous errors resulted from mismatched assumptions
    about existing method signatures, providers, DTOs, and repositories.
-   Alternatives considered: Guessing the current implementation.
-   Why alternatives were rejected: Guessing causes unnecessary
    TypeScript/NestJS errors.
-   Consequences: The next AI should request relevant files when exact
    code is not available.
-   Related files/modules: Entire backend.
-   Date or conversation stage: Ongoing debugging/mentoring workflow.

------------------------------------------------------------------------

## DEC-035: Never Invent Missing Architecture

-   Status: LOCKED
-   Decision: Missing project details must be explicitly marked
    `[UNKNOWN]` rather than silently invented.
-   Reason: The project is being documented so another AI can continue
    without the original chat.
-   Alternatives considered: Filling gaps with assumed industry-standard
    architecture.
-   Why alternatives were rejected: Assumptions can accidentally become
    false project decisions.
-   Consequences: Documentation distinguishes established facts from
    unknowns.
-   Related files/modules: All project documentation.
-   Date or conversation stage: Project handover documentation.

------------------------------------------------------------------------

## DEC-036: Security Must Be Considered at Every Relevant Layer

-   Status: LOCKED
-   Decision: Security, validation, authorization, error handling, and
    edge cases must be considered whenever relevant to an
    implementation.
-   Reason: Nexus targets large scale and includes private messaging, so
    security cannot be added only at the end.
-   Alternatives considered: Implementing features first and securing
    them later.
-   Why alternatives were rejected: Security failures are more expensive
    to correct after interfaces and data flows are established.
-   Consequences: WebSocket DTO validation, authentication,
    authorization, rate limiting, and future E2EE are integrated into
    the architecture.
-   Related files/modules: Authentication, Messaging, WebSocket
    infrastructure, future E2EE.
-   Date or conversation stage: Security/roadmap discussions.

------------------------------------------------------------------------

## DEC-037: No Custom Cryptography for E2EE

-   Status: LOCKED
-   Decision: Do not invent a custom cryptographic protocol for private
    messaging.
-   Reason: Secure messaging requires mature cryptographic protocol
    design and correct key lifecycle management.
-   Alternatives considered: Custom AES/encryption wrapper; encrypting
    messages independently without a protocol.
-   Why alternatives were rejected: Encryption alone does not provide a
    complete secure messaging protocol.
-   Consequences: Future private messaging must use a proper
    Signal-style implementation.
-   Related files/modules: Future E2EE messaging.
-   Date or conversation stage: Privacy/E2EE discussion.

------------------------------------------------------------------------

## DEC-038: 1M-User Scalability as a Design Constraint

-   Status: LOCKED
-   Decision: Major backend architecture should consider a target scale
    of approximately 1 million users.
-   Reason: The project owner wants the architecture to avoid obvious
    single-user/small-app assumptions.
-   Alternatives considered: Optimizing only for a small initial
    deployment.
-   Why alternatives were rejected: Major architectural choices become
    harder to change later.
-   Consequences: Redis, PostgreSQL, WebSocket room delivery,
    pagination, repository/query separation, and future distributed
    WebSocket coordination are considered with scale in mind.
-   Related files/modules: Backend infrastructure, Messaging, future
    Feed/Social Graph.
-   Date or conversation stage: Scaling roadmap discussions.

------------------------------------------------------------------------

## DEC-039: Cursor Pagination for Future Message History

-   Status: LOCKED
-   Decision: Future high-scale message history should use cursor-based
    pagination rather than unbounded offset pagination.
-   Reason: Cursor pagination is more appropriate for large ordered
    message datasets and avoids increasingly expensive deep offsets.
-   Alternatives considered: Offset pagination.
-   Why alternatives were rejected: Offset pagination becomes
    inefficient for deep pages in large message histories.
-   Consequences: Future message-history query contracts should be
    designed around cursors.
-   Related files/modules: Future `ChannelMessageQueryService`/API
    contracts.
-   Date or conversation stage: Future Messaging roadmap.

------------------------------------------------------------------------

## DEC-040: Focused Git Commits

-   Status: LOCKED
-   Decision: Each meaningful implementation milestone should have a
    focused Git commit.
-   Reason: Focused commits make the project easier to review, debug,
    revert, and hand over.
-   Alternatives considered: Large mixed commits.
-   Why alternatives were rejected: Mixed commits make it difficult to
    identify which change introduced a problem.
-   Consequences: Each lecture should finish with a tested, focused
    commit.
-   Related files/modules: Entire repository.
-   Date or conversation stage: Development workflow.

------------------------------------------------------------------------

# Decisions That Remain \[UNKNOWN\]

The following have not been sufficiently finalized in the conversation
and must not be converted into locked decisions without explicit
approval:

-   Exact production hosting topology
-   Exact CI/CD implementation
-   Exact production WebSocket adapter/scaling infrastructure
-   Exact Signal Protocol library and version
-   Exact E2EE multi-device protocol implementation
-   Exact secret-group cryptographic protocol
-   Exact frontend final stack if not already finalized elsewhere
-   Exact complete API contract
-   Exact complete Prisma schema documentation
-   Exact branch naming strategy
-   Exact lint/format configuration
-   Exact automated test suite and coverage targets
-   Exact production object-storage configuration
-   Exact final deployment topology

------------------------------------------------------------------------

# Change-Control Rule

Any future proposal that changes a **LOCKED** decision must:

1.  Clearly identify the affected decision ID.
2.  Explain why the existing decision is insufficient.
3.  Explain the technical/business consequences.
4.  Present the alternative.
5.  Obtain explicit approval before changing the architecture.

Until approval is given, the locked decision remains the source of
truth.
