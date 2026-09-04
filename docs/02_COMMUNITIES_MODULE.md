# Nexus --- Future Communities Module

## Status

-   Planned
-   Important architectural decision: Servers remain the primary
    collaboration unit.

## Core Decision

Communities must NOT become a second copy of Servers.

``` text
Server
 ├── Private Server
 ├── Public Server
 └── Community-oriented Server
```

The Community module provides public discovery, subscriptions and
discussion-oriented presentation around existing collaboration
infrastructure.

## High-Level Architecture

``` text
Community Discovery
        │
   ┌────┴────┐
   ▼         ▼
Discovery   Search
   │         │
   └────┬────┘
        ▼
      Server
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
Channels Threads Members
        │
        ▼
     Messages
```

## Responsibilities

Community: - discovery - subscriptions - public feed - community
metadata - categories/tags - rules - moderation - ranking

Server: - membership - roles - permissions - channels - invites

Messaging: - messages - reactions - threads - realtime events

## Module Structure

``` text
src/modules/communities/
├── controllers/
├── services/
│   ├── community-command.service.ts
│   ├── community-query.service.ts
│   ├── community-membership.service.ts
│   ├── community-moderation.service.ts
│   └── community-discovery.service.ts
├── repositories/
├── dto/
├── guards/
├── types/
├── constants/
├── exceptions/
├── mappers/
└── communities.module.ts
```

## Data Direction

``` text
Community
- id
- serverId
- name
- slug
- description
- visibility
- discoveryEnabled
- rules
- createdAt
```

Reuse existing Server and Messaging concepts instead of duplicating
membership/message state.

## Search

Start with PostgreSQL full-text search. Introduce
OpenSearch/Elasticsearch only when actual scale requires it.

## Lecture Flow

51.1 Community Architecture 51.2 Community vs Server 51.3 Domain Model
51.4 Repository 51.5 Community Creation 51.6 Membership/Subscription
51.7 Community Posts 51.8 Comments and Threads 51.9 Moderation 51.10
Discovery/Search 51.11 Ranking 51.12 WebSocket Integration 51.13 Scaling

## Security

Server permissions remain authoritative. Add anti-spam, reports, blocks,
moderation controls and append-only moderation history.

## Definition of Done

Community lifecycle, subscriptions, visibility, posts, comments/threads,
moderation, discovery, realtime updates, tests and observability.
