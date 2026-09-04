# Nexus --- Future Notification Module

## Status

-   Planned
-   Production strategy: modular monolith first, event-driven boundaries
    for later extraction
-   Stack: NestJS, PostgreSQL, Prisma, Redis, Socket.IO
-   Architecture: `common / core / config / modules`

## High-Level Architecture

``` text
Domain Modules
   │
   ├── Messages
   ├── Servers
   ├── Social Graph
   ├── Communities
   └── Security
          │
          ▼
   Notification Orchestrator
          │
     ┌────┼───────────┐
     ▼    ▼           ▼
 PostgreSQL Redis   WebSocket
     │    │           │
     └────┴───────────┘
             │
             ▼
          Frontend
```

## Module Structure

``` text
src/modules/notifications/
├── controllers/
├── gateways/
├── services/
│   ├── notification-command.service.ts
│   ├── notification-query.service.ts
│   ├── notification-delivery.service.ts
│   └── notification-preference.service.ts
├── repositories/
├── dto/
├── types/
├── constants/
├── exceptions/
├── mappers/
└── notifications.module.ts
```

## Domain

`Notification`: durable event relevant to a user.

`NotificationDelivery`: transport attempt through WebSocket, push,
email, etc.

`NotificationPreference`: user-controlled delivery preferences.

## Database Direction

``` text
Notification
- id
- recipientUserId
- actorUserId?
- type
- entityType
- entityId
- payload
- readAt?
- createdAt
- expiresAt?

NotificationPreference
- userId
- notificationType
- inAppEnabled
- pushEnabled
- emailEnabled

NotificationDelivery
- id
- notificationId
- channel
- status
- deliveredAt
- failedAt
- retryCount
```

Indexes: - `(recipientUserId, createdAt)` -
`(recipientUserId, readAt)` - `(recipientUserId, type, createdAt)`

## Redis

Use Redis for unread counters, deduplication windows, delivery fan-out,
rate limiting and aggregation. PostgreSQL remains the durable source of
truth.

## Event Strategy

Domain services should publish application/domain events instead of
directly coupling to notification internals.

``` text
MessageCommandService
       │
       ▼
 MessageCreated event
       │
       ▼
 Notification listener
       │
       ▼
 NotificationCommandService
```

## WebSocket Events

``` text
notification:new
notification:read
notification:read-all
notification:count
```

## Lecture Flow

50.1 Notification Architecture 50.2 Notification Domain Model 50.3
Repository 50.4 Command Service 50.5 Query Service 50.6 Preferences 50.7
Event Integration 50.8 WebSocket Delivery 50.9 Redis Unread Counters
50.10 Deduplication 50.11 Retry and Failure Handling 50.12 Testing 50.13
Production Hardening

## Production Decisions

-   PostgreSQL = durable state
-   Redis = ephemeral acceleration
-   WebSocket = realtime delivery
-   idempotency = mandatory
-   duplicate events must not create duplicate notifications
-   delivery failure must not lose durable notification data
-   authorization must happen before exposing notification details

## Definition of Done

Persistent notifications, read/unread state, preferences, realtime
delivery, Redis acceleration, idempotency, retry handling, observability
and security tests.
