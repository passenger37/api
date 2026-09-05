# Nexus --- Typing, Presence & Realtime State

## Status

-   Planned
-   Nature: ephemeral
-   Primary store: Redis
-   Ordinary typing/presence should not be persisted in PostgreSQL.

## High-Level Architecture

``` text
Client
  │
  ▼
Socket.IO Gateway
  │
  ▼
Presence Service
  │
  ▼
Redis
  ├── presence
  ├── typing
  ├── heartbeat TTL
  └── distributed state
```

## Presence Model

Presence is session/device based.

``` text
User
 ├── Device A → online
 ├── Device B → online
 └── Device C → offline
```

Overall presence is derived from active sessions.

## Redis Direction

``` text
presence:user:{userId}
presence:session:{sessionId}
typing:channel:{channelId}:{userId}
```

Use TTLs to remove stale state automatically.

## Heartbeats

``` text
Client
  │ heartbeat
  ▼
Gateway
  │
  ▼
Redis EXPIRE
```

Expired sessions are considered stale/offline.

## Typing Events

``` text
typing:start
typing:stop
```

Validate authentication and channel/conversation access before
room-scoped broadcast.

## Presence Events

``` text
presence:update
presence:online
presence:offline
```

Scope presence to the relevant audience: DM participants, server/channel
members, or call participants.

## Privacy

Future settings: - everyone - connections - server members - nobody

Typing status should normally only be visible inside the relevant
conversation.

## Lecture Flow

52.1 Presence Architecture 52.2 Redis Ephemeral State 52.3 Session
Presence 52.4 Heartbeats 52.5 Offline Detection 52.6 Typing Events 52.7
Room-Scoped Broadcast 52.8 Presence Privacy 52.9 Multi-Device Presence
52.10 Redis Failure Handling 52.11 Horizontal Scaling 52.12 Testing

## Scaling

``` text
Client
 │
 ├── Gateway A
 ├── Gateway B
 └── Gateway C
        │
        ▼
      Redis
```

Introduce Socket.IO Redis adapter/pub/sub when horizontal scaling
requires it.

## Definition of Done

Presence, heartbeat, TTL cleanup, typing events, scoped rooms, privacy
settings, multi-device semantics, tests and metrics.
