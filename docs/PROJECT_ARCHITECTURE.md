## 1. Project Identity

### Project

**Nexus**

### Product

A next-generation social/community platform with a strong server-based collaboration model and a hybrid messaging architecture.

### Backend-first rule

The backend must be completed before frontend development begins.

The frontend is explicitly **not** to be started while the backend roadmap is incomplete.

---

# 2. Architectural Philosophy

Nexus is being developed as a **production-grade modular backend**, not as a collection of ad-hoc endpoints.

The architecture emphasizes:

- clear module boundaries
- domain-first organization
- reusable infrastructure
- repository abstraction
- service-layer business logic
- WebSocket gateway separation
- validation at boundaries
- normalized error contracts
- authorization before mutation
- rate limiting
- scalable asynchronous processing
- strong database integrity
- security-by-default
- future support for approximately **1 million users**

The architecture should evolve incrementally.

Do not build all future infrastructure prematurely. Introduce each technology when its corresponding scale, reliability, security, or product requirement needs it.

---

# 3. High-Level Backend Architecture

```text
Client
  |
  +--------------------+
  |                    |
HTTP API           WebSocket Gateway
  |                    |
  +---------+----------+
            |
        Application Layer
            |
   +--------+---------+
   |        |         |
Command   Query   Validation
Services  Services  / Policy
   |        |         |
   +--------+---------+
            |
       Domain / Business
            |
   +--------+---------+
   |        |         |
Repositories  Domain Services
   | 
   +-----------------------------+
   |             |               |
PostgreSQL      Redis        Object Storage
                               |
                         Media / Attachments

The exact deployment topology is [UNKNOWN] and should be finalized during production deployment work.

4. Backend Module Organization

The backend follows the project preference:

apps/api/src/

common/
core/
config/
modules/
common/

Reusable cross-cutting components.

Examples already established/discussed:

common/
  interceptor/
  websocket/
    rate-limit/
    error/

Responsibilities include:

global interceptors
WebSocket rate limiting
WebSocket error normalization
reusable cross-cutting utilities

Business-specific logic should not be placed here.

5. core/

Infrastructure-level services.

Typical responsibilities:

database infrastructure
Redis infrastructure
logging infrastructure
security infrastructure
shared infrastructure adapters

The exact current core/ contents are [UNKNOWN]; inspect the existing repository before adding files.

6. config/

Centralized application configuration.

Configuration should be environment-driven.

Secrets must never be committed to source control.

.env / .env.development values are configuration inputs and must never be copied into documentation, commits, or AI prompts.

Exact current configuration structure is [UNKNOWN].

7. modules/

Business capabilities.

The project uses a domain-first module structure.

Conceptually:

modules/
  messages/
    domain/
    services/
    repositories/
    gateways/
    dto/
    types/
    constants/
    exceptions/
    mappers/

Not every module must contain every directory. Create only what the module actually requires.

8. Messaging Architecture

Messaging is a major architectural boundary in Nexus.

The project uses a hybrid messaging model.

Locked conversation types
1. Cloud-based community/server channels

Normal server/channel messaging.

Characteristics:

server-backed
persistent
scalable
WebSocket-based realtime delivery
2. Standard Direct Messages

Cloud-backed direct messages.

3. Private E2EE Direct Messages

Private direct messages use an architecture based on the Signal Protocol.

The server should not become the plaintext authority for these conversations.

4. Secret Groups

Private group messaging is part of the future messaging direction.

Exact cryptographic group protocol/design is [UNKNOWN] and must be designed before implementation.

9. Why Hybrid Messaging

A single messaging architecture does not satisfy every use case.

Public/community/server communication benefits from:

server-side persistence
moderation
search
message history
realtime fanout
channel-level permissions

Private E2EE communication requires:

client-side encryption
minimized server knowledge
cryptographic identity
forward secrecy
secure session establishment

Therefore Nexus intentionally separates these messaging trust models.

10. Signal-Style E2EE Direction

The project explicitly discussed messaging privacy similar to Signal/Telegram.

Locked direction

Private E2EE messaging is planned around the Signal Protocol model.

Important future concepts:

identity keys
prekeys
session establishment
ratcheting
forward secrecy
message encryption/decryption on clients
encrypted payloads at the server
server-side inability to read E2EE plaintext

Exact library, language binding, key backup strategy, multi-device synchronization model, and group protocol are [UNKNOWN].

Do not invent these decisions.

11. Server Architecture

Servers are the primary collaboration unit.

The architecture intentionally favors Discord-style Servers over Communities.

A Server can contain:

Server
 ├── Categories
 │    └── Channels
 ├── Roles
 ├── Permissions
 ├── Members
 ├── Invites
 ├── Announcements
 ├── Events
 └── Threads

Future voice/live functionality is planned but its implementation details are [UNKNOWN].

12. Server Template System

Server creation includes:

create server
create owner membership
create default roles
apply server template

Default roles discussed:

Owner
Admin
Moderator
Member

The exact permission matrix is [UNKNOWN] and should be defined before detailed authorization implementation.

13. Authentication Architecture

Authentication is designed around server-side session/token state and invalidation.

Important principles:

access authentication must be verifiable
refresh/session state must be controllable server-side
logout/revocation must be possible
authorization must happen independently of authentication
WebSocket connections must be authenticated
WebSocket events must be authorized before business mutations

Exact production token format, session schema, expiration values, rotation policy, and device model are [UNKNOWN].

14. Authorization Architecture

Nexus uses RBAC.

Authorization should be evaluated at the appropriate resource boundary.

Example:

User
  |
Server Membership
  |
Role
  |
Permissions
  |
Channel / Message Action

Authorization must not rely only on frontend checks.

The backend remains authoritative.

15. WebSocket Architecture

Messaging uses WebSocket gateways for realtime operations.

The current major gateway discussed is:

src/modules/messages/gateways/channel-message.gateway.ts

The gateway is responsible for:

receiving WebSocket events
validating payloads
authenticating connection/user context
enforcing authorization
applying rate limits
invoking application services
broadcasting events
normalizing errors

The gateway should remain thin.

Business logic belongs in services.

Database operations belong in repositories.

16. WebSocket Event Architecture

Message-related events already discussed include:

send-message
update-message
delete-message
pin-message
unpin-message
add-reaction
remove-reaction

The exact final event naming convention should follow the existing implementation.

Do not rename already implemented public event contracts without asking first.

17. WebSocket Validation

Nexus introduced:

WebSocketValidationPipe

The existing implementation uses:

plainToInstance
class-validator
whitelist: true
forbidNonWhitelisted: true

Conceptually:

Raw WebSocket Payload
        |
        v
DTO Transformation
        |
        v
Validation
        |
        +---- invalid ---> normalized error
        |
        v
Typed DTO
        |
        v
Gateway handler

This is a security boundary.

The gateway should not trust arbitrary client payloads.

18. DTO Architecture

WebSocket DTOs are organized under:

src/modules/messages/dto/websocket/

Discussed DTOs:

send-channel-message.request.ts
update-channel-message.request.ts
delete-channel-message.request.ts
pin-channel-message.request.ts
unpin-channel-message.request.ts
add-message-reaction.request.ts
remove-message-reaction.request.ts

Example established DTO rules include:

UUID validation for identifiers
string validation
maximum message length
optional parent message identifier

The exact validation rules for every DTO must be taken from the current source code, not reconstructed from memory.

19. WebSocket Rate Limiting

The project introduced a reusable rate-limit service under:

src/common/websocket/rate-limit/

Redis is used as the backing store.

Conceptually:

WebSocket event
      |
      v
RateLimitService
      |
      v
Redis counter
      |
      +---- allowed ----> command service
      |
      +---- exceeded ---> normalized error

Example discussed policy:

send-message
20 events
10 seconds
per user

This exact limit is an existing implementation example and should not automatically be applied to every future event.

Different event classes may require different limits.

20. Redis Architecture

A reusable:

RedisService

has been discussed/implemented.

It exposes basic operations including:

get
set
del
exists
direct client access

The rate limiter requires increment/expiration behavior.

The existing implementation encountered missing increment and expire methods, which were part of the current implementation work.

Do not assume additional Redis abstractions exist until verified in source.

21. WebSocket Error Architecture

Nexus introduced a normalized WebSocket error contract.

Current direction:

Exception
   |
   v
WebSocket Error Normalizer
   |
   +--> internal error code
   +--> event name
   +--> normalized message
   |
   v
Stable WebSocket error response

The normalizer is under:

src/common/websocket/error/

Discussed concepts include:

normalization layer
internal error code
event preservation
gateway integration
error mapping

WebSocketErrorCode.INTERNAL_ERROR was required during implementation and caused a compile error when it had not yet been added.

22. Error Contract Principles

Clients should not receive arbitrary framework exception structures as their permanent WebSocket API.

The backend should provide:

stable event identity
stable internal error code
safe public error message
predictable response structure

Internal exception details must not leak to clients.

23. Database Architecture

Primary relational database:

PostgreSQL

ORM:

Prisma

The project is using:

Prisma 6.16.x

A previous Prisma 7 migration issue was encountered because Prisma 7 changed datasource configuration behavior.

The project therefore moved/continued with Prisma 6.

Do not upgrade Prisma major versions without explicit approval.

24. Repository Pattern

Repositories isolate persistence from application/business logic.

Example:

ChannelMessageReactionRepository

Responsibilities:

create reaction
delete reaction
find reaction
find reactions

Services should not directly contain raw persistence logic when a repository abstraction exists.

25. Hybrid Prisma + SQL Direction

The project selected a hybrid data-access approach.

Use Prisma for normal relational operations.

Use SQL/query objects where complex graph or performance-oriented queries require them.

This is especially relevant to:

social graph queries
feed queries
complex joins
high-performance read paths

The rule is not "SQL everywhere."

Use the simplest appropriate data-access mechanism per operation.

26. Query / Command Separation

The project uses separate services for reads and mutations.

Example messaging services:

ChannelMessageCommandService
ChannelMessageQueryService
ChannelMessageReactionCommandService
ChannelMessageReactionQueryService

The separation provides:

clearer responsibility
easier authorization boundaries
optimized read/write paths
easier testing
future scaling

This is a service-level CQRS-style separation rather than a requirement to deploy separate command/query microservices.

27. Message Reaction Architecture

Reactions are modeled separately from messages.

The current implementation introduced:

ChannelMessageReaction

and a repository:

ChannelMessageReactionRepository

A reaction includes the relationship between:

message
member
emoji

The project corrected an important schema/API mismatch:

messageId_memberId_emoji

rather than:

messageId_userId_emoji

because reactions are associated with the server member identity in the current schema.

28. Message Pinning

Message pin/unpin is a first-class message operation.

It is handled through WebSocket events and authorization.

The exact pin storage model and audit fields are [UNKNOWN] unless present in the current database schema.

29. Message Lifecycle

Conceptual message flow:

Client
  |
  | send-message
  v
Gateway
  |
  +--> authentication
  |
  +--> DTO validation
  |
  +--> rate limit
  |
  +--> authorization
  |
  v
Command Service
  |
  v
Repository
  |
  v
PostgreSQL
  |
  v
Message created
  |
  v
Broadcast to channel room

For reactions:

add-reaction
   |
Gateway
   |
validation
   |
rate limit / authorization
   |
Reaction Command Service
   |
Reaction Repository
   |
PostgreSQL
   |
Reaction Query Service if required
   |
Broadcast reaction event
30. Scaling Strategy for 1 Million Users

The architecture should scale horizontally.

The expected future direction is:

                    Load Balancer
                         |
          +--------------+--------------+
          |              |              |
       API #1         API #2         API #N
          |              |              |
          +--------------+--------------+
                         |
                    PostgreSQL
                         |
                       Redis
                         |
              background workers
                         |
                 object storage/CDN

For WebSockets, multiple gateway instances will require shared coordination/fanout infrastructure.

The exact WebSocket adapter/pub-sub topology is [UNKNOWN].

Do not invent it until the relevant scaling phase.

31. Redis Future Responsibilities

Redis may eventually support:

rate limiting
caching
session state
presence
distributed locks where justified
WebSocket coordination
ephemeral state

Each use case should have explicit TTL and failure behavior.

Redis must not become the source of truth for durable business data unless explicitly decided.

32. Asynchronous Processing

At larger scale, expensive non-request work should move to background processing.

Potential areas discussed/implied by the production architecture include:

notifications
feed fanout
media processing
analytics
search indexing

Exact queue technology and worker architecture are [UNKNOWN] unless defined in the master plan.

Do not select a queue technology prematurely.

33. Storage Architecture

Object storage is intended for media rather than PostgreSQL blobs.

Previously discussed storage technologies include:

Cloudflare R2
Supabase storage
MinIO for local development

The exact final production object-storage choice for the completed backend is [UNKNOWN] unless locked in the master plan.

34. CDN

Media should be served through a CDN rather than directly from application servers.

The exact CDN configuration is [UNKNOWN].

35. Observability

Production backend should eventually provide:

Logs
Metrics
Traces
Health checks
Error monitoring

The exact observability stack is [UNKNOWN].

Existing logging infrastructure is already part of the project.

36. Security Architecture

Security must be layered.

Transport
   |
Authentication
   |
DTO Validation
   |
Rate Limiting
   |
Authorization
   |
Business Validation
   |
Database Integrity
   |
Audit / Monitoring

Important rules:

never trust client input
never trust frontend authorization
never expose secrets
do not log passwords/tokens
do not expose internal stack traces
validate UUIDs and bounded strings
protect WebSocket event handlers
rate-limit abuse-prone events
enforce membership before server/channel actions
37. Production Security Concepts to Add Later

Future security work should include only items already represented by the roadmap.

Known direction includes:

WebSocket authentication hardening
WebSocket authorization hardening
rate limiting
spam protection
negative/security tests
error normalization
E2EE messaging

Additional security features are [UNKNOWN] unless explicitly added to the roadmap.

38. Testing Architecture

Testing should exist at multiple levels:

Unit tests
Integration tests
WebSocket tests
Security/negative tests
Database tests
End-to-end tests

The messaging roadmap explicitly reached:

WebSocket Negative & Security Tests

Testing must verify failure paths, not only successful operations.

39. Development Workflow

Each implementation lecture should follow this sequence:

1. Objective
2. Why this exists
3. Architecture placement
4. Existing-code dependency check
5. Database impact
6. File/folder changes
7. Implementation
8. Compile
9. Unit/integration/security tests
10. Manual WebSocket/API verification
11. Git commit
12. Update project status

Never jump directly into large code generation.

40. Git Workflow

Major completed implementation steps should receive a focused commit.

Commit messages should describe one coherent change.

Example style:

feat(messages): add websocket reaction query service
fix(websocket): normalize gateway errors
test(messages): add reaction security tests

Exact repository Git convention is [UNKNOWN].

41. Current Messaging Architecture Boundary

The current work is centered around:

MessagesModule
   |
   +-- ChannelMessageGateway
   |
   +-- ChannelMessageCommandService
   +-- ChannelMessageQueryService
   |
   +-- ChannelMessageReactionCommandService
   +-- ChannelMessageReactionQueryService
   |
   +-- Validation Services
   |
   +-- ServerMemberQueryService
   |
   +-- Repositories
   |
   +-- DTOs

The exact current provider/import list must be inspected before modifying MessagesModule.

This is important because dependency-injection errors have already occurred when repositories were not registered correctly.

42. Important Existing Implementation Lessons
Repository registration

A NestJS service can compile successfully while runtime dependency injection still fails.

Example failure already encountered:

Nest can't resolve dependencies of
ChannelMessageReactionCommandService

Root cause category:

ChannelMessageReactionRepository
was not available as a provider in MessagesModule.

Therefore every new provider must be checked in:

messages.module.ts
Naming integrity

A serious naming mistake occurred where:

channel-message.repository.ts

contained:

ChannelMessageReactionRepository

while other code expected:

ChannelMessageRepository

This caused multiple TypeScript import failures.

Rule:

File name, exported class, provider registration, constructor dependency, and module registration must agree.

43. Prisma Schema Integrity

Prisma relation fields require both sides of the relationship.

Previously encountered errors included:

User.messageReactions

without a matching relation field on:

ChannelMessageReaction

and:

ChannelMessageReaction.member

without the opposite relation on:

ServerMember

Rule:

Whenever a Prisma relation is introduced, inspect both relation sides and run Prisma validation/generation before continuing.

44. Prisma Generated Client Integrity

After schema changes:

prisma generate

must be run as part of the established workflow.

The project has used:

pnpm prisma generate

The exact migration command policy is [UNKNOWN].

45. Current Frontend Boundary

Frontend development begins only after the backend completion milestone defined by the project roadmap.

Frontend must consume completed backend capabilities rather than forcing backend design changes around UI assumptions.

The frontend is therefore downstream of:

Authentication
Servers
Roles
Members
Channels
Invites
Messaging
Security
Realtime infrastructure

The exact final backend-completion checklist is defined in the roadmap and should be followed rather than starting frontend early.

46. Future Implementation Method

For every future feature:

Step A — Locate the feature

Determine:

Which module?
Which layer?
Which database entities?
HTTP or WebSocket?
Command or Query?
Security boundary?
Step B — Inspect existing code

Before writing code, request/open:

relevant module
current service
repository
DTO
gateway/controller
Prisma schema
module provider registration
tests

Never guess existing source code.

Step C — Design

Produce:

Request
  |
DTO
  |
Gateway/Controller
  |
Validation
  |
Authorization
  |
Command/Query Service
  |
Repository
  |
Database
Step D — Implement one small slice

Do not implement an entire subsystem in one response.

Step E — Test

Compile first, then execute targeted tests.

Step F — Commit

Commit only after the slice is stable.

47. Low-Level Design Rules

Each feature should have an explicit LLD before implementation when complexity warrants it.

LLD should document:

class responsibilities
method responsibilities
dependency direction
input/output types
validation rules
authorization rules
transaction boundaries
database operations
cache behavior
failure behavior
idempotency requirements
event publication
observability

Avoid circular dependencies.

Preferred direction:

Gateway/Controller
       |
Application Service
       |
Domain/Policy
       |
Repository
       |
Infrastructure
48. Event Broadcasting Design

Realtime broadcasts should occur only after the authoritative mutation succeeds.

Correct:

validate
  ↓
authorize
  ↓
persist
  ↓
broadcast

Avoid:

broadcast
  ↓
persist

because clients could observe an event for a mutation that ultimately failed.

49. Idempotency

Any future operation that can be retried must define whether duplicate requests are:

rejected
ignored
safely repeated

Reaction operations are especially important because the unique relationship:

message + member + emoji

naturally provides a database integrity boundary.

Exact error behavior for duplicate reactions is [UNKNOWN].

50. Transaction Boundaries

Use database transactions when multiple durable writes must succeed or fail together.

Do not wrap every single query in a transaction unnecessarily.

Transaction requirements for individual future features are [UNKNOWN] until their data model is defined.

51. Caching Rules

Do not cache mutable business state without defining:

cache key
TTL
invalidation
stale behavior
failure behavior

Redis is an accelerator/state layer, not a replacement for PostgreSQL durable truth.

52. API Boundary

HTTP APIs and WebSocket events are external contracts.

Changing:

route
event name
payload shape
error code
authorization behavior

can be a breaking change.

Therefore API/event contracts must be documented before significant changes.

53. Production Deployment Direction

The project has discussed:

Docker
PostgreSQL
Redis
MinIO
Cloudflare R2
CDN
VPS/cloud deployment

Local development uses Docker-based infrastructure where applicable.

Exact production topology is [UNKNOWN].

54. Architecture Decision Summary
Area	Decision
Backend approach	Backend-first
Project structure	common / core / config / modules
Business modules	Domain-first
Server model	Discord-style Servers
Messaging	Hybrid
Private E2EE	Signal Protocol direction
Database	PostgreSQL
ORM	Prisma 6.x
Cache/ephemeral	Redis
Messaging realtime	WebSocket
Authorization	RBAC
Persistence abstraction	Repository pattern
Reads/writes	Separate query/command services
WebSocket validation	DTO + class-validator pipe
WebSocket errors	Normalized contract
WebSocket abuse protection	Redis-backed rate limiting
Frontend start	After backend completion
55. Do Not Change Without Approval

The following are LOCKED project directions:

Backend-first development until the backend completion milestone.
Nexus server model.
Discord-style Servers as the primary collaboration unit.
Hybrid messaging model.
Private E2EE messaging direction based on Signal Protocol.
PostgreSQL as the relational database.
Prisma 6.x direction.
Redis as the shared ephemeral/cache/rate-limit infrastructure.
RBAC authorization direction.
Domain-first backend organization.
common for reusable cross-cutting components.
core for infrastructure.
config for configuration.
modules for business features.
Repository-based persistence abstraction.
Separate command/query service direction.
WebSocket DTO validation and hardening.
Normalized WebSocket error contract.
Production-oriented incremental development.
Frontend must not start early.
56. Unknowns That Must Be Resolved Later

The following must not be invented:

exact production cloud/VPS topology
exact Kubernetes/container orchestration decision
exact WebSocket horizontal-scaling adapter
exact queue technology
exact CDN provider configuration
exact observability stack
exact E2EE library/binding
exact Signal multi-device design
exact group E2EE protocol
exact key backup/recovery design
exact message retention policy
exact permission matrix
exact database schemas not already established
exact API contracts not already established
exact testing framework configuration
exact CI/CD pipeline
exact production environment variables
exact token expiration values

Use [UNKNOWN] until decided.

57. Master Implementation Rule

The architecture is not implemented by jumping from the current code directly to every future technology.

Instead:

Current stable code
      ↓
Complete current feature
      ↓
Test
      ↓
Secure
      ↓
Measure
      ↓
Identify scale requirement
      ↓
Introduce infrastructure only when justified
      ↓
Integrate with existing module
      ↓
Test migration
      ↓
Commit
      ↓
Update roadmap/status

This keeps Nexus understandable while allowing the backend to evolve toward production scale.

58. Continuation Protocol for the Next AI

Before modifying the backend, the next AI must read:

PROJECT_CONTEXT.md
ROADMAP.md
DECISIONS.md
ARCHITECTURE.md
CURRENT_STATUS.md
MASTER_BACKEND_PLAN.md

Then:

identify the current lecture/task
inspect the actual repository files
verify existing implementation
identify dependencies
explain the next small change
implement only that change
compile/test
record the result
update status/decision documentation

The AI must not silently redesign the architecture.

59. Relationship With MASTER_BACKEND_PLAN.md

MASTER_BACKEND_PLAN.md remains the detailed implementation roadmap.

This document is the architectural companion.

Use:

MASTER_BACKEND_PLAN.md
        +
PROJECT_ARCHITECTURE.md
        +
CURRENT_STATUS.md

as the operational source of truth for backend continuation.

"""

out.write_text(architecture, encoding="utf-8")
print(out)