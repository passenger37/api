# Nexus --- PROJECT_CONTEXT.md

## Project Name

**Nexus**

------------------------------------------------------------------------

## Short Project Description

Nexus is a next-generation social/community platform being developed as
a large-scale backend-first system.

The platform combines:

-   social networking
-   server-based communities
-   channels
-   roles and permissions
-   messaging
-   reactions
-   moderation
-   notifications
-   social graph
-   feed
-   future private E2EE messaging using a Signal-style architecture

The project is being designed with a long-term target of supporting
approximately **1 million users**.

------------------------------------------------------------------------

## Problem the Project Solves

Nexus aims to combine social networking and community collaboration into
a single platform while providing stronger architectural separation
between:

-   public/social communication
-   server/community communication
-   ordinary cloud-backed direct messaging
-   private end-to-end encrypted messaging

The system is intended to provide a modern server/channel experience
similar to community platforms while also supporting social-network
features.

------------------------------------------------------------------------

## Target Users

The exact demographic segmentation has not been formally finalized.

Known target usage includes:

-   individual social-network users
-   users participating in servers
-   server/community members
-   users communicating through channels
-   users using direct messaging
-   users requiring private encrypted communication

Exact final personas:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Main Business Requirements

## 1. Server-Based Communities

Servers are the primary collaboration unit.

A server can contain:

-   categories
-   channels
-   members
-   roles
-   permissions
-   invites
-   announcements
-   events
-   threads
-   future voice/live functionality

The architecture intentionally prefers **Servers** over a separate
primary "Community" abstraction.

------------------------------------------------------------------------

## 2. Messaging

Nexus uses a hybrid messaging model.

The agreed messaging types are:

1.  Cloud-based server/community channels
2.  Standard cloud-backed direct messages
3.  Private E2EE direct messages using a Signal-style protocol
4.  Secret/private groups

These messaging types have different security requirements.

Server/channel messages are server-controlled and stored by the backend.

Private E2EE messages are intended to use client-side encryption where
the backend transports encrypted message envelopes rather than plaintext
message content.

------------------------------------------------------------------------

## 3. Social Networking

The broader product includes social-network capabilities such as:

-   user profiles
-   social graph
-   feed
-   communities/servers
-   messaging
-   notifications
-   reactions
-   future media features

The exact final social-feed feature set is not fully specified in the
current backend status.

------------------------------------------------------------------------

## 4. Security

Security is a first-class requirement.

The backend is designed around:

-   authentication
-   authorization
-   RBAC
-   permission checks
-   DTO validation
-   WebSocket authentication
-   WebSocket authorization
-   WebSocket rate limiting
-   message validation
-   server/channel membership validation
-   future E2EE messaging
-   audit/moderation capabilities

The client must never be trusted for identity or permissions.

For WebSocket operations, the authenticated identity is taken from the
server-side WebSocket context, currently represented by:

``` text
client.data.userId
```

------------------------------------------------------------------------

# Functional Requirements

## Authentication

The backend has an authentication foundation involving:

-   JWT
-   refresh tokens
-   server-side session/token invalidation direction
-   Passport/NestJS security infrastructure

The exact production token/session implementation is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

## Authorization

Nexus uses:

-   RBAC
-   server permissions
-   membership checks
-   permission-specific validation

A permission check follows the existing service contract:

``` text
hasPermission(
  serverId,
  userId,
  permission,
  channelId?
)
```

The exact permission enum contains at least:

``` text
ServerPermission.MANAGE_MESSAGES
```

------------------------------------------------------------------------

## Messaging

The messaging backend supports or is implementing:

-   channel message creation
-   message editing
-   message deletion
-   message pinning
-   message unpinning
-   message reactions
-   reaction removal
-   message queries
-   reaction queries
-   WebSocket delivery
-   room-based broadcasting
-   validation
-   authorization
-   rate limiting

Message content has a maximum length of:

``` text
4000 characters
```

------------------------------------------------------------------------

## Replies

Messages support an optional:

``` text
parentMessageId
```

This is used for replying/thread-like message relationships.

The parent message must be validated before creating a reply.

------------------------------------------------------------------------

## Reactions

Reaction records are associated with a server member rather than
directly with a user.

The project uses the conceptual relationship:

``` text
ChannelMessageReaction
    ↓
ServerMember
    ↓
User
```

The Prisma composite unique identifier uses:

``` text
messageId_memberId_emoji
```

not:

``` text
messageId_userId_emoji
```

------------------------------------------------------------------------

# Non-Functional Requirements

## Scalability

The architecture is being designed with a target of approximately:

**1 million users**

Important scaling responsibilities are separated:

### PostgreSQL

Durable relational data and transactional state.

### Redis

Ephemeral/distributed infrastructure such as:

-   rate limiting
-   presence
-   distributed coordination
-   future WebSocket scaling

### WebSocket infrastructure

Responsible for real-time delivery.

Future distributed WebSocket scaling is planned.

### Object storage

The broader project has considered:

-   Cloudflare R2
-   Supabase storage
-   MinIO for local development

Exact production media-storage architecture:

**\[UNKNOWN\]**

------------------------------------------------------------------------

## Reliability

Important operations should use:

-   database transactions
-   validation
-   authorization
-   repository abstraction
-   centralized error handling
-   controlled event broadcasting

Message persistence should complete before broadcasting the
authoritative message-created/updated state.

------------------------------------------------------------------------

## Maintainability

The backend uses modular architecture.

Business responsibilities are separated into:

-   gateways/controllers
-   DTOs
-   command services
-   query services
-   validation services
-   repositories
-   infrastructure services

------------------------------------------------------------------------

# Technology Stack

## Backend

Primary backend framework:

**NestJS**

Runtime/language:

**TypeScript**

------------------------------------------------------------------------

## Database

Primary database:

**PostgreSQL**

ORM:

**Prisma**

Prisma version encountered in the project:

``` text
6.16 / 6.16.3
```

------------------------------------------------------------------------

## Cache / Infrastructure

**Redis**

Node Redis client:

``` text
redis
```

The project has a custom:

``` text
RedisService
```

------------------------------------------------------------------------

## WebSockets

NestJS WebSocket gateway architecture is being used.

The message gateway currently includes:

``` text
ChannelMessageGateway
```

Socket type:

``` text
Socket
```

The exact WebSocket adapter/transport configuration is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

## Validation

Selected validation libraries:

``` text
class-validator
class-transformer
```

Custom WebSocket validation is implemented through:

``` text
WebSocketValidationPipe
```

The pipe transforms incoming payloads into DTO instances and validates
them using:

``` text
whitelist: true
forbidNonWhitelisted: true
```

------------------------------------------------------------------------

## Authentication / Security Libraries

Known NestJS infrastructure includes:

-   PassportModule
-   NestJS security infrastructure
-   JWT/refresh-token direction

Exact JWT package/version:

**\[UNKNOWN\]**

------------------------------------------------------------------------

## Development Tools

Known development tools include:

-   pnpm
-   Docker
-   Docker Compose
-   Git
-   GitHub
-   Visual Studio / development IDE
-   PostgreSQL
-   Redis
-   Prisma CLI

Common development command:

``` text
pnpm start:dev
```

------------------------------------------------------------------------

# Local Infrastructure

The project has used Docker Compose for local development.

Previously discussed local services include:

``` text
PostgreSQL 16-alpine
Redis 7-alpine
MinIO
pgAdmin
```

Exact current Docker Compose configuration:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Backend Architecture

Nexus currently follows a modular-monolith style backend architecture.

The system is not being split into microservices at this stage.

The reason is to keep domain boundaries clear while avoiding premature
distributed-system complexity.

Future distributed infrastructure can be introduced where required,
particularly around:

-   WebSocket delivery
-   Redis
-   background processing
-   high-scale messaging

------------------------------------------------------------------------

# Backend Module Organization

The project uses a module/domain-oriented structure.

Conceptually:

``` text
src/
├── common/
├── core/
├── config/
└── modules/
    ├── authentication/
    ├── users/
    ├── servers/
    ├── messages/
    ├── social/
    ├── feed/
    └── ...
```

Only modules confirmed in the conversation should be treated as
existing.

The exact current module list is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Common / Core Infrastructure

The project has intentionally separated reusable infrastructure from
business modules.

Important shared areas include:

``` text
src/common/
src/core/
src/config/
```

Interceptors were intentionally moved into:

``` text
common/interceptor
```

The reason was to keep reusable cross-cutting infrastructure out of
individual business domains.

------------------------------------------------------------------------

# Messaging Module Structure

The Messaging module uses a domain-first structure.

Known areas include:

``` text
src/modules/messages/
├── dto/
│   └── websocket/
├── gateways/
├── repositories/
├── services/
└── ...
```

The exact complete current tree is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Messaging DTO Structure

Known WebSocket DTO location:

``` text
src/modules/messages/dto/websocket/
```

Known DTOs:

``` text
send-channel-message.request.ts
update-channel-message.request.ts
delete-channel-message.request.ts
pin-channel-message.request.ts
unpin-channel-message.request.ts
add-message-reaction.request.ts
remove-message-reaction.request.ts
```

------------------------------------------------------------------------

# Example DTO Rules

`SendChannelMessageRequest` currently includes:

``` text
channelId
content
parentMessageId?
```

Validation rules include:

-   `channelId` must be a UUID
-   `content` must be a string
-   `content` maximum length is 4000
-   `parentMessageId` is optional
-   when provided, `parentMessageId` must be a UUID

------------------------------------------------------------------------

# WebSocket Validation

The project uses a custom:

``` text
WebSocketValidationPipe
```

Its responsibilities are:

1.  transform raw payload into the DTO class
2.  run class-validator
3.  whitelist allowed properties
4.  reject non-whitelisted properties
5.  reject invalid payloads

The current error message is:

``` text
Invalid WebSocket payload.
```

The gateway-wide validation phase is currently at:

``` text
Lecture 40.28.9
```

------------------------------------------------------------------------

# Messaging Command / Query Separation

Nexus intentionally separates write and read responsibilities.

## Command Services

Command services perform state-changing operations.

Examples:

``` text
ChannelMessageCommandService
ChannelMessageReactionCommandService
```

Responsibilities include:

-   validating business rules
-   invoking repositories
-   creating/updating/deleting state
-   executing transactions where necessary

------------------------------------------------------------------------

## Query Services

Query services perform read operations.

Examples:

``` text
ChannelMessageQueryService
ChannelMessageReactionQueryService
```

Responsibilities include:

-   retrieving messages
-   retrieving reactions
-   returning read models/data
-   avoiding mutation responsibilities

------------------------------------------------------------------------

# Repository Pattern

Repositories encapsulate database operations.

Known repositories include:

``` text
ChannelMessageRepository
ChannelMessageReactionRepository
```

Important separation:

``` text
ChannelMessageRepository
```

handles channel messages.

``` text
ChannelMessageReactionRepository
```

handles message reactions.

They must not be accidentally merged or renamed.

------------------------------------------------------------------------

# Prisma

Prisma is the selected relational data-access layer.

The project uses Prisma transactions for important message mutations.

A message creation flow conceptually follows:

``` text
validate channel
        ↓
get serverId
        ↓
validate member
        ↓
validate parent message
        ↓
validate content
        ↓
resolve ServerMember
        ↓
Prisma transaction
        ↓
repository.create()
```

------------------------------------------------------------------------

# Database Design Principles

The project uses PostgreSQL as the durable source of truth.

Important rules:

-   use foreign keys for relationships
-   use database constraints where appropriate
-   use transactions for multi-step atomic mutations
-   use indexes/unique constraints for frequently queried relationships
-   do not use Redis as durable message storage
-   preserve relational integrity

The exact complete schema is documented separately in:

``` text
DATABASE.md
```

and should be treated as the source of truth for schema details.

------------------------------------------------------------------------

# Error Handling

The project uses NestJS exceptions and global exception handling.

Known exceptions include:

``` text
BadRequestException
ForbiddenException
```

For example, deleting a message without authorization produces:

``` text
You do not have permission to delete this message.
```

The exact global exception response format is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Validation Strategy

Validation occurs at multiple levels.

## Transport validation

DTO validation protects the WebSocket boundary.

## Business validation

Services validate:

-   channel existence
-   membership
-   parent message
-   permissions
-   message ownership
-   message content

## Database validation

Prisma/PostgreSQL enforce relational constraints.

This layered approach prevents relying on any single validation
mechanism.

------------------------------------------------------------------------

# WebSocket Security Model

The intended pipeline is:

``` text
Client
  ↓
WebSocket connection
  ↓
Authentication
  ↓
client.data.userId
  ↓
DTO validation
  ↓
membership validation
  ↓
permission validation
  ↓
rate limiting
  ↓
command service
  ↓
repository
  ↓
PostgreSQL
  ↓
broadcast
```

The server must never trust:

-   client-supplied user IDs
-   client-supplied permission claims
-   arbitrary server membership claims

------------------------------------------------------------------------

# WebSocket Rate Limiting

The messaging gateway has rate limiting work.

The `send-message` operation uses a key conceptually:

``` text
ws:send-message:{userId}
```

Current example discussed:

``` text
limit: 20
windowSeconds: 10
```

Redis is used for the rate-limit state.

The current Redis service exposes:

``` text
getClient()
get()
set()
del()
exists()
```

The rate limiter additionally requires operations such as:

``` text
increment()
expire()
```

Their final implementation status is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Room-Based Messaging

Message events are broadcast to channel rooms.

The conceptual model is:

``` text
Server
  └── Channel
        └── WebSocket room
```

Messages created/updated/pinned/unpinned/reactions are intended to be
delivered to the relevant channel room.

The exact room naming convention is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Authentication and Authorization Philosophy

Authentication answers:

> Who is this user?

Authorization answers:

> Is this authenticated user allowed to perform this operation?

Nexus intentionally keeps those responsibilities separate.

For message operations:

``` text
authenticated user
        ↓
server membership
        ↓
channel access
        ↓
permission
        ↓
operation
```

------------------------------------------------------------------------

# RBAC

Nexus uses role-based access control and explicit permissions.

Servers have roles and permissions.

The messaging system checks permissions such as:

``` text
MANAGE_MESSAGES
```

Users can delete their own messages without management permission.

Other users require the appropriate message-management permission.

------------------------------------------------------------------------

# Security Decisions

Important security decisions include:

-   authentication is mandatory for protected WebSocket operations
-   authorization is server-side
-   membership is validated server-side
-   permissions are validated server-side
-   DTO validation occurs before command execution
-   unknown DTO fields should be rejected
-   rate limiting is performed server-side
-   private E2EE messaging will not expose plaintext private-message
    content to the backend
-   Signal-style cryptographic design is preferred over inventing a
    custom encryption protocol

The exact Signal Protocol implementation library is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Frontend Strategy

Development is intentionally backend-first.

The backend should be developed through the major Messaging backend
milestone before frontend implementation becomes the active phase.

When frontend development starts, it should implement already-completed
backend contracts.

The previously agreed frontend order is:

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

Frontend technology direction has included React/Next.js in the project
discussions.

The exact final frontend stack at the current stage is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Broader Product Direction

Nexus is intended to combine:

``` text
Social Network
+
Servers
+
Channels
+
Messaging
+
Private Messaging
+
E2EE
+
Notifications
+
Feed
```

The project is intended to evolve toward a large-scale platform rather
than a small CRUD application.

------------------------------------------------------------------------

# Scalability Direction for 1M Users

The architecture is being designed with approximately one million users
in mind.

Important principles:

## PostgreSQL

Use for durable authoritative state.

## Redis

Use for:

-   rate limits
-   presence
-   ephemeral state
-   distributed coordination
-   future WebSocket scaling

## WebSocket

Use for real-time delivery rather than polling for interactive
messaging.

## Database access

Use repositories and query services to isolate data access and make
optimization possible.

## Transactions

Use transactions for operations that must be atomic.

## Pagination

Future message history must use cursor-based pagination rather than
unbounded offset pagination.

## Distributed WebSockets

Future scaling will require room/event coordination across multiple
WebSocket instances.

The exact production infrastructure is:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Development Method

The project follows a lecture-based implementation process.

Each lecture should represent a small coherent engineering milestone.

Preferred workflow:

``` text
Understand
    ↓
Architecture
    ↓
Why
    ↓
Where
    ↓
Implementation
    ↓
Compile
    ↓
Test
    ↓
Fix
    ↓
Commit
    ↓
Update status
```

The assistant should not generate the whole project at once.

------------------------------------------------------------------------

# Coding Conventions

Known conventions:

-   TypeScript
-   NestJS dependency injection
-   PascalCase class names
-   camelCase methods/properties
-   kebab-case file names
-   `.service.ts` for services
-   `.repository.ts` for repositories
-   `.request.ts` for request DTOs
-   module-specific domain organization
-   explicit DTO validation
-   separate command/query responsibilities

Exact linting/formatting configuration:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Git Workflow

The project uses Git and prefers focused commits after meaningful
implementation milestones.

Exact branch naming convention:

**\[UNKNOWN\]**

Exact latest commit hash:

**\[UNKNOWN\]**

------------------------------------------------------------------------

# Hosting / Deployment

The project has discussed:

-   Docker
-   VPS deployment
-   Cloudflare R2
-   Supabase
-   AWS/Azure possibilities
-   CDN usage

The exact final production hosting architecture has not been locked in
the current conversation.

Therefore:

**Production deployment architecture: \[UNKNOWN\]**

------------------------------------------------------------------------

# Important Constraints

1.  Backend-first development must be preserved.
2.  Messaging backend is a major prerequisite before frontend
    development.
3.  Servers are the primary collaboration abstraction.
4.  Message and reaction repositories must remain separate.
5.  Command and query responsibilities must remain separated.
6.  Authentication and authorization must remain separate concerns.
7.  WebSocket payloads must use DTO validation.
8.  Unknown WebSocket payload properties should be rejected.
9.  Client identity must not be trusted.
10. Redis must not become the durable source of truth for messages.
11. Private E2EE messaging must use a proper Signal-style protocol
    rather than ad-hoc cryptography.
12. Locked architectural decisions must not be changed without explicit
    approval.
13. Missing implementation details must be inspected from the existing
    source rather than guessed.

------------------------------------------------------------------------

# Things That Must Never Be Changed Without Asking First

The following are established project decisions and should be treated as
locked unless the project owner explicitly changes them:

-   Nexus is backend-first during the current development stage.
-   Servers are the primary community/collaboration unit.
-   Messaging uses a hybrid architecture.
-   Private E2EE messaging is part of the future product.
-   Signal-style cryptography is preferred for private E2EE messaging.
-   NestJS is the backend framework.
-   PostgreSQL is the primary durable database.
-   Prisma is the database ORM/data-access layer.
-   Redis is used for infrastructure/ephemeral state.
-   RBAC and explicit permissions are part of authorization.
-   Repository pattern is used for database access.
-   Command/query separation is used in Messaging.
-   WebSocket DTO validation is required.
-   WebSocket authorization is required.
-   WebSocket rate limiting is required.
-   Frontend should follow completion/stabilization of the agreed
    backend milestone rather than interrupting backend development.

------------------------------------------------------------------------

# Current Source-of-Truth Files

The project should maintain these documents:

``` text
PROJECT_CONTEXT.md
ROADMAP.md
ARCHITECTURE.md
DECISIONS.md
API_CONTRACTS.md
DATABASE.md
CURRENT_STATUS.md
NEW_AI_INSTRUCTIONS.md
CHAT_HISTORY_SUMMARY.md
```

For continuation, the next AI should read at minimum:

``` text
PROJECT_CONTEXT.md
ROADMAP.md
ARCHITECTURE.md
DECISIONS.md
CURRENT_STATUS.md
```

before proposing implementation changes.

------------------------------------------------------------------------

# Unknowns

The following details were not sufficiently established in the
conversation and must not be guessed:

-   final production hosting topology
-   exact production frontend implementation
-   exact WebSocket adapter configuration
-   exact API contract for all HTTP endpoints
-   complete Prisma schema
-   complete current module tree
-   exact test suite status
-   exact CI/CD pipeline
-   exact Signal Protocol library/version
-   exact E2EE multi-device protocol details
-   exact production object-storage configuration
-   exact branch strategy
-   exact latest Git commit
-   exact lint/format configuration
-   final user personas
