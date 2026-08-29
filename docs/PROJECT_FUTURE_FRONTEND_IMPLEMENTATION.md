# NEXUS — PROJECT FUTURE FRONTEND IMPLEMENTATION

## 0. Purpose

This document is the frontend master implementation roadmap for Nexus.

It is designed to let development continue independently while preserving the architectural decisions already made for the project.

The frontend must not be treated as "just UI". Nexus is a large social platform with:

- Social feed
- Servers
- Channels
- Communities/discussions
- Real-time messaging
- Standard cloud messaging
- Private E2EE messaging
- Signal Protocol based private messaging
- Reels/media
- Notifications
- Search
- Profiles
- Organizations
- Moderation
- Admin surfaces
- AI-assisted experiences
- Privacy/security controls

The frontend therefore follows a layered architecture and feature-first development strategy.

---

# 1. Current Project Direction

## Core project

Nexus is a next-generation social network.

The frontend should eventually support:

1. Global user identity
2. Social graph
3. Feed
4. Servers
5. Server channels
6. Channel messaging
7. Reactions
8. Notifications
9. Search
10. Profiles
11. Media
12. Privacy controls
13. E2EE messaging
14. Signal-style private conversations
15. Secret groups
16. AI features
17. Moderation
18. Admin tools

---

# 2. Current Backend Development Gate

Backend development is intentionally ahead of frontend.

Current backend work is in Messaging WebSocket implementation around Lecture 40.x.

The frontend should begin only after the backend reaches a stable integration boundary.

## Frontend start gate

Before serious frontend implementation starts, backend should have stable:

- Authentication
- Authorization
- Users
- Social graph
- Servers
- Server members
- Channels
- Channel permissions
- Feed APIs
- Messaging REST/command APIs
- Messaging WebSocket events
- Reaction APIs/events
- Notifications contract
- DTO contracts
- Error contract
- Pagination contract
- Upload/media contract

The backend does NOT need every advanced production feature before frontend starts.

The important requirement is a stable API contract.

---

# 3. Frontend Technology Strategy

## Primary stack

Recommended:

- Next.js
- React
- TypeScript
- Tailwind CSS
- CSS variables
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Socket.IO client
- Web Crypto APIs
- IndexedDB
- Service Worker/PWA where appropriate

## Future supporting technologies

Potential production technologies:

- WebRTC
- Web Push
- Web Workers
- Comlink
- IndexedDB
- Dexie
- Media APIs
- WebCodecs where appropriate
- WebAssembly for cryptographic/media-heavy operations if needed

---

# 4. Frontend Architecture

Recommended structure:

```text
apps/web/
├── app/
│   ├── (auth)/
│   ├── (main)/
│   ├── servers/
│   ├── messages/
│   ├── settings/
│   ├── profile/
│   ├── search/
│   ├── notifications/
│   └── admin/
│
├── src/
│   ├── components/
│   ├── features/
│   ├── layouts/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── stores/
│   ├── queries/
│   ├── mutations/
│   ├── realtime/
│   ├── crypto/
│   ├── api/
│   ├── types/
│   ├── schemas/
│   ├── config/
│   ├── constants/
│   ├── utils/
│   └── styles/
│
├── public/
└── tests/
```

---

# 5. Architectural Principles

## 5.1 Feature-first

Avoid putting all logic into global folders.

Example:

```text
src/features/messages/
├── components/
├── hooks/
├── queries/
├── mutations/
├── realtime/
├── types/
└── utils/
```

## 5.2 Server state vs client state

Use TanStack Query for:

- API data
- pagination
- cache
- server synchronization
- optimistic updates

Use Zustand for:

- UI state
- selected server
- selected channel
- modal state
- composer state
- local preferences
- temporary interaction state

Do NOT use Zustand as a replacement for server-state caching.

---

# 6. High-Level Frontend Architecture

```text
                    ┌─────────────────────┐
                    │       Next.js       │
                    │       App Router    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        UI Components     Feature Layer     Layout Layer
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Application State   │
                    ├─────────────────────┤
                    │ TanStack Query      │
                    │ Zustand             │
                    │ Forms               │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
          REST API        WebSocket          Uploads
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                         NestJS Backend
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
             PostgreSQL      Redis          Object Storage
```

---

# 7. UI/UX Design Direction

Nexus UI direction:

## Primary visual language

- Modern
- Minimal
- Premium
- Glassmorphism
- Layered surfaces
- Soft borders
- Subtle shadows
- High readability
- Strong hierarchy
- Motion used carefully

Glassmorphism should NOT be applied everywhere.

Use glass surfaces for:

- navigation
- floating panels
- dialogs
- command palette
- contextual menus
- media overlays
- selected cards

Avoid excessive blur on:

- long text
- dense message lists
- tables
- accessibility-critical content

---

# 8. High-Level Design System

Create a design system before building dozens of screens.

## Tokens

```text
Color
Typography
Spacing
Radius
Shadows
Blur
Motion
Z-index
Breakpoints
Container widths
```

Example:

```text
--color-background
--color-surface
--color-surface-elevated
--color-border
--color-primary
--color-danger

--radius-sm
--radius-md
--radius-lg
--radius-xl

--space-1
--space-2
--space-4
--space-6
--space-8
```

---

# 9. Component Architecture

## Primitive components

```text
Button
Input
Textarea
Avatar
Badge
IconButton
Tooltip
Popover
Dialog
Dropdown
Tabs
Separator
Skeleton
Spinner
Toast
```

## Composite components

```text
UserCard
PostCard
CommentCard
ServerCard
ChannelItem
MessageBubble
MessageComposer
NotificationItem
ReactionPicker
MediaPreview
ProfileHeader
```

## Feature components

```text
Feed
ServerSidebar
ChannelSidebar
MessageList
MessageThread
NotificationCenter
SearchPanel
ProfileView
SettingsPanel
```

---

# 10. Frontend Implementation Phases

# PHASE F0 — Frontend Foundation

## Goal

Prepare production-grade frontend infrastructure.

### Lectures

F0.1 — Initialize Next.js application

F0.2 — TypeScript configuration

F0.3 — ESLint and formatting

F0.4 — Environment configuration

F0.5 — Path aliases

F0.6 — Design tokens

F0.7 — Tailwind setup

F0.8 — Base component architecture

F0.9 — Error boundaries

F0.10 — Loading boundaries

F0.11 — Route architecture

F0.12 — API client foundation

### Tools

- Next.js
- TypeScript
- ESLint
- Prettier
- Tailwind
- pnpm
- Git

### Git milestone

```bash
git commit -m "feat(web): initialize frontend foundation"
```

---

# PHASE F1 — Design System

## Goal

Build reusable UI infrastructure before feature screens.

### Lectures

F1.1 — Typography system

F1.2 — Color system

F1.3 — Spacing system

F1.4 — Radius system

F1.5 — Elevation

F1.6 — Glass surfaces

F1.7 — Buttons

F1.8 — Inputs

F1.9 — Dialogs

F1.10 — Dropdowns

F1.11 — Toasts

F1.12 — Tooltips

F1.13 — Skeleton loaders

F1.14 — Responsive layout primitives

F1.15 — Accessibility primitives

---

# PHASE F2 — Application Shell

## Goal

Build the main Nexus shell.

High-level layout:

```text
┌───────────────────────────────────────────────┐
│                  Top Bar                      │
├──────────┬─────────────────────────┬──────────┤
│          │                         │          │
│ Sidebar  │       Main Content      │ Context  │
│          │                         │ Panel    │
│          │                         │          │
└──────────┴─────────────────────────┴──────────┘
```

### Lectures

F2.1 — Root layout

F2.2 — Navigation

F2.3 — Desktop layout

F2.4 — Tablet layout

F2.5 — Mobile layout

F2.6 — Command palette

F2.7 — Global search

F2.8 — Notification center

F2.9 — User menu

F2.10 — Responsive navigation

---

# PHASE F3 — Authentication

## Goal

Connect frontend authentication to backend.

### Lectures

F3.1 — Login screen

F3.2 — Registration

F3.3 — Auth API client

F3.4 — Session bootstrap

F3.5 — Protected routes

F3.6 — Auth loading state

F3.7 — Logout

F3.8 — Token/session refresh

F3.9 — Unauthorized handling

F3.10 — Security boundaries

### Important

Do not expose sensitive secrets in browser environment variables.

---

# PHASE F4 — User Profile

### Lectures

F4.1 — Profile API

F4.2 — Profile header

F4.3 — Avatar

F4.4 — Bio

F4.5 — Achievements

F4.6 — Activity

F4.7 — Followers

F4.8 — Following

F4.9 — Edit profile

F4.10 — Privacy settings

---

# PHASE F5 — Social Graph

### Lectures

F5.1 — Follow button

F5.2 — Unfollow

F5.3 — Follow requests

F5.4 — Followers list

F5.5 — Following list

F5.6 — Optimistic updates

F5.7 — Cache invalidation

F5.8 — Social graph loading states

---

# PHASE F6 — Feed

## High-level design

```text
┌─────────────────────────────────────┐
│ Feed Header                         │
│ Latest Following Communities News   │
├─────────────────────────────────────┤
│                                     │
│ Post                                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Post                                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Post                                │
└─────────────────────────────────────┘
```

Filters:

- Latest
- Following
- Communities
- News
- Local
- Trending
- AI Recommended

### Lectures

F6.1 — Feed API

F6.2 — Feed page

F6.3 — Post card

F6.4 — Infinite scrolling

F6.5 — IntersectionObserver

F6.6 — Skeleton loading

F6.7 — Empty state

F6.8 — Post creation

F6.9 — Post editing

F6.10 — Post deletion

F6.11 — Comments

F6.12 — Likes/reactions

F6.13 — Share

F6.14 — Optimistic interaction

F6.15 — Feed caching

F6.16 — AI recommended feed UI

---

# PHASE F7 — Servers

Nexus uses Discord-style Servers as a primary collaboration unit.

## High-level design

```text
Server
 ├── Overview
 ├── Categories
 │    ├── Channel
 │    ├── Channel
 │    └── Channel
 ├── Members
 ├── Roles
 ├── Events
 ├── Announcements
 └── Settings
```

### Lectures

F7.1 — Server discovery

F7.2 — Server list

F7.3 — Server sidebar

F7.4 — Server overview

F7.5 — Categories

F7.6 — Channels

F7.7 — Channel selection

F7.8 — Members

F7.9 — Roles

F7.10 — Permissions UI

F7.11 — Invites

F7.12 — Server settings

F7.13 — Server moderation

---

# PHASE F8 — Channel Messaging

This is the first major real-time frontend phase.

## High-level architecture

```text
Message UI
    │
    ├── REST → history
    │
    └── WebSocket → live events
                     │
                     ├── message-created
                     ├── message-updated
                     ├── message-deleted
                     ├── message-pinned
                     ├── message-unpinned
                     ├── reaction-added
                     └── reaction-removed
```

### Lectures

F8.1 — Message API client

F8.2 — Message list

F8.3 — Message bubble

F8.4 — Message composer

F8.5 — Reply UI

F8.6 — Edit UI

F8.7 — Delete UI

F8.8 — Pin UI

F8.9 — WebSocket client

F8.10 — Connection state

F8.11 — Join channel room

F8.12 — send-message

F8.13 — message-created

F8.14 — message-updated

F8.15 — message-deleted

F8.16 — message-pinned

F8.17 — message-unpinned

F8.18 — optimistic messaging

F8.19 — duplicate event protection

F8.20 — reconnect strategy

---

# PHASE F9 — Reactions

### Lectures

F9.1 — Reaction picker

F9.2 — Add reaction

F9.3 — Remove reaction

F9.4 — Reaction counts

F9.5 — Reaction WebSocket events

F9.6 — Optimistic reactions

F9.7 — Reaction cache synchronization

---

# PHASE F10 — Notifications

### Lectures

F10.1 — Notification model

F10.2 — Notification list

F10.3 — Notification badge

F10.4 — Real-time notification events

F10.5 — Mark as read

F10.6 — Notification preferences

F10.7 — Browser notifications

F10.8 — Push notifications

---

# PHASE F11 — Media

## Architecture

```text
Browser
  │
  ├── image
  ├── video
  ├── audio
  └── document
        │
        ▼
 Upload Service
        │
        ▼
 Object Storage
        │
        ▼
 CDN
```

Recommended production direction:

- Cloudflare R2 / equivalent object storage
- CDN
- Signed upload URLs
- Signed download URLs
- Image optimization
- Video processing

### Lectures

F11.1 — Upload abstraction

F11.2 — Progress

F11.3 — Image preview

F11.4 — Video preview

F11.5 — Drag/drop

F11.6 — Upload cancellation

F11.7 — Retry

F11.8 — Media gallery

F11.9 — CDN integration

---

# PHASE F12 — Search

### Lectures

F12.1 — Search UI

F12.2 — Search debounce

F12.3 — Search API

F12.4 — Search suggestions

F12.5 — Users search

F12.6 — Servers search

F12.7 — Posts search

F12.8 — Channels search

F12.9 — Search history

---

# PHASE F13 — Privacy & Security UI

This phase begins before E2EE UX.

### Lectures

F13.1 — Privacy settings

F13.2 — Account security

F13.3 — Active sessions

F13.4 — Device management

F13.5 — Login history

F13.6 — Block users

F13.7 — Mute users

F13.8 — Message privacy

F13.9 — Server privacy

F13.10 — Permission UI

---

# PHASE F14 — Private E2EE Messaging

This is a separate architecture from normal channel messaging.

Nexus agreed direction:

1. Standard cloud-backed messages
2. Private E2EE DMs
3. Signal Protocol style cryptography
4. Secret groups

Do NOT simply add "encrypt=true" to normal messaging.

---

# 14. E2EE High-Level Architecture

```text
                Device A
                   │
          ┌────────▼────────┐
          │ Identity Keys   │
          │ PreKeys         │
          │ Session State   │
          └────────┬────────┘
                   │
              Encrypt
                   │
                   ▼
             Ciphertext
                   │
              Server/Relay
                   │
             Ciphertext only
                   │
                   ▼
                Device B
                   │
                Decrypt
                   │
                   ▼
             Plain Message
```

Server should not need plaintext message content for E2EE conversations.

---

# 15. Signal-Style Frontend Concepts

New concepts to learn:

- Identity keys
- Session keys
- Prekeys
- Signed prekeys
- One-time prekeys
- Key agreement
- Forward secrecy
- Post-compromise security
- Device identity
- Session establishment
- Session rotation
- Safety number / verification
- Key fingerprints
- Multi-device key management
- Encrypted local storage
- Key backup strategy
- Secure deletion limitations

Production implementation should use a mature audited cryptographic implementation/protocol library rather than inventing cryptography.

---

# PHASE F15 — E2EE Device Architecture

### Lectures

F15.1 — Device identity

F15.2 — Device registration

F15.3 — Key generation

F15.4 — Identity key storage

F15.5 — Prekey bundle

F15.6 — Session establishment

F15.7 — Encrypted message envelope

F15.8 — Local encrypted database

F15.9 — Device verification

F15.10 — Key rotation

F15.11 — Multi-device synchronization

F15.12 — Recovery strategy

---

# PHASE F16 — Secret Groups

### Lectures

F16.1 — Secret group model

F16.2 — Group key management

F16.3 — Member addition

F16.4 — Member removal

F16.5 — Key rotation

F16.6 — Encrypted group messages

F16.7 — Device synchronization

F16.8 — Group verification

---

# PHASE F17 — Advanced Messaging

### Lectures

F17.1 — Threads

F17.2 — Message search

F17.3 — Mentions

F17.4 — Typing indicators

F17.5 — Read receipts

F17.6 — Presence

F17.7 — Attachments

F17.8 — Voice messages

F17.9 — Disappearing messages

F17.10 — Message forwarding

F17.11 — Message link previews

---

# PHASE F18 — Reels / Short Video

### Lectures

F18.1 — Reels feed

F18.2 — Vertical scrolling

F18.3 — Video preloading

F18.4 — IntersectionObserver

F18.5 — Autoplay policies

F18.6 — Media controls

F18.7 — Likes

F18.8 — Comments

F18.9 — Sharing

F18.10 — Performance optimization

---

# PHASE F19 — Organizations

Unified Organization architecture.

### Lectures

F19.1 — Organization profile

F19.2 — Verified organization badge

F19.3 — Organization posts

F19.4 — Organization members

F19.5 — Organization permissions

F19.6 — Organization discovery

F19.7 — Organization analytics

---

# PHASE F20 — Opportunities

Target users can discover opportunities such as:

- internships
- scholarships
- competitions
- jobs
- events
- learning programs

### Lectures

F20.1 — Opportunity feed

F20.2 — Filters

F20.3 — Recommendations

F20.4 — Save opportunity

F20.5 — Apply

F20.6 — AI recommendations

F20.7 — Parent-controlled interests where applicable

---

# PHASE F21 — AI UX

AI should be an application layer, not the owner of business logic.

### Features

- Feed recommendations
- Search assistant
- Writing assistance
- Summarization
- Question generation
- Moderation assistance
- Content suggestions
- Smart replies

### Lectures

F21.1 — AI UI architecture

F21.2 — Streaming responses

F21.3 — AI loading states

F21.4 — Tool execution UI

F21.5 — AI error handling

F21.6 — AI privacy controls

F21.7 — Local AI integration where useful

---

# PHASE F22 — Admin Frontend

Future app:

```text
apps/admin/
```

### Areas

- User management
- Server moderation
- Reports
- Abuse detection
- Content moderation
- Organization verification
- System analytics
- Audit logs
- Feature flags

---

# PHASE F23 — Performance Engineering

### Concepts

- Code splitting
- Dynamic imports
- Streaming
- Suspense
- Server Components
- Client Components
- Virtualization
- Memoization
- Image optimization
- CDN caching
- Query caching
- Prefetching
- Web Workers
- IndexedDB

### Lectures

F23.1 — Bundle analysis

F23.2 — Rendering strategy

F23.3 — Server Components

F23.4 — Client boundaries

F23.5 — List virtualization

F23.6 — Feed performance

F23.7 — Message performance

F23.8 — Image optimization

F23.9 — WebSocket performance

F23.10 — Offline caching

---

# PHASE F24 — Offline / Resilience

### Lectures

F24.1 — Network detection

F24.2 — Offline UI

F24.3 — Cached feed

F24.4 — Cached messages

F24.5 — Retry queues

F24.6 — Mutation reconciliation

F24.7 — WebSocket reconnection

F24.8 — Conflict handling

---

# PHASE F25 — Testing

Testing layers:

```text
Unit
 ↓
Component
 ↓
Integration
 ↓
E2E
 ↓
Load / performance
 ↓
Security
```

## Tools

- Vitest/Jest
- React Testing Library
- Playwright
- MSW
- ESLint
- TypeScript
- Lighthouse
- browser performance tooling

### Lectures

F25.1 — Unit testing

F25.2 — Component testing

F25.3 — API mocking

F25.4 — WebSocket testing

F25.5 — Authentication E2E

F25.6 — Feed E2E

F25.7 — Messaging E2E

F25.8 — E2EE test strategy

F25.9 — Accessibility testing

F25.10 — Performance testing

---

# PHASE F26 — Accessibility

Target:

- Keyboard navigation
- Screen readers
- Focus management
- Contrast
- Reduced motion
- Accessible forms
- Accessible dialogs
- ARIA where necessary

### Lectures

F26.1 — Accessibility foundation

F26.2 — Keyboard navigation

F26.3 — Focus management

F26.4 — Screen reader support

F26.5 — Reduced motion

F26.6 — Accessibility audit

---

# PHASE F27 — Production Hardening

### Lectures

F27.1 — CSP

F27.2 — Security headers

F27.3 — XSS protection

F27.4 — CSRF strategy

F27.5 — Secure cookies/session strategy

F27.6 — Dependency auditing

F27.7 — Error monitoring

F27.8 — Performance monitoring

F27.9 — Feature flags

F27.10 — Environment separation

F27.11 — Production builds

F27.12 — Deployment

---

# 16. Frontend Data Flow Strategy

## REST

Use REST for:

- initial page data
- historical messages
- profiles
- servers
- channels
- settings
- search
- pagination

## WebSocket

Use WebSocket for:

- live messages
- edits
- deletes
- reactions
- pins
- notifications
- typing
- presence

## Local state

Use local state for:

- modal
- composer
- selected item
- temporary UI state

---

# 17. Message Data Flow

```text
Open Channel
     │
     ▼
Fetch message history
     │
     ▼
Connect WebSocket
     │
     ▼
Join channel room
     │
     ▼
User sends message
     │
     ▼
WebSocket send-message
     │
     ▼
Backend
     │
     ▼
Persist
     │
     ▼
Broadcast message-created
     │
     ▼
All room clients
     │
     ▼
TanStack Query cache update
```

---

# 18. Optimistic Update Strategy

Use optimistic updates selectively.

Good candidates:

- reactions
- likes
- follow/unfollow
- pin/unpin
- simple UI mutations

Be more careful with:

- message creation
- E2EE messages
- financial/critical operations

Message sending can use a temporary client ID:

```text
clientMessageId
```

Then reconcile:

```text
pending
  ↓
sent
  ↓
server-confirmed
  ↓
failed
```

---

# 19. WebSocket State Machine

Frontend should model connection state explicitly.

```text
DISCONNECTED
      ↓
CONNECTING
      ↓
CONNECTED
      ↓
RECONNECTING
      ↓
CONNECTED
```

Handle:

- reconnect
- authentication failure
- server disconnect
- duplicate events
- stale subscriptions
- room rejoin

---

# 20. Error Handling

Frontend should normalize backend errors.

Example:

```text
API Error
 ├── validation
 ├── authentication
 ├── authorization
 ├── not-found
 ├── conflict
 ├── rate-limit
 └── server-error
```

Never display raw backend stack traces.

---

# 21. API Contract Strategy

Frontend and backend should share contracts where practical.

Possible future package:

```text
packages/contracts/
```

Example:

```text
packages/contracts/
├── auth/
├── users/
├── servers/
├── messages/
├── reactions/
└── notifications/
```

Use shared schemas where it genuinely reduces drift.

Do not create a giant coupled package.

---

# 22. Security Rules

Never:

- store passwords in frontend
- expose JWT secrets
- expose database credentials
- trust client permissions
- trust client user IDs
- perform authorization only in UI
- implement custom cryptography

Frontend permission checks are UX.

Backend permission checks are security.

---

# 23. E2EE Security Rule

For private E2EE:

```text
UI
 ↓
Crypto/session layer
 ↓
Encrypted envelope
 ↓
WebSocket/API transport
 ↓
Server
```

The normal React component should NOT directly manipulate cryptographic keys.

Use:

```text
features/messages
        │
        ▼
crypto/session-service
        │
        ▼
secure local storage
```

---

# 24. Frontend Repository Strategy

Every meaningful feature should be committed independently.

Example:

```bash
git commit -m "feat(web): add message list"
git commit -m "feat(web): add message composer"
git commit -m "feat(web): add websocket messaging"
git commit -m "feat(web): add reaction events"
```

Avoid huge commits containing multiple unrelated features.

---

# 25. Development Workflow

For every lecture:

## Step 1

Understand the architecture.

## Step 2

Identify backend contract.

## Step 3

Create/update types.

## Step 4

Create API/query layer.

## Step 5

Create UI.

## Step 6

Connect mutations.

## Step 7

Connect real-time events.

## Step 8

Add loading states.

## Step 9

Add error states.

## Step 10

Add optimistic behavior where appropriate.

## Step 11

Test.

## Step 12

Commit.

---

# 26. High-Level Screen Map

```text
NEXUS
│
├── Home
│   ├── Feed
│   ├── Trending
│   ├── Following
│   ├── News
│   └── Local
│
├── Servers
│   ├── Discover
│   └── Server
│       ├── Overview
│       ├── Channels
│       ├── Members
│       ├── Events
│       └── Settings
│
├── Messages
│   ├── DMs
│   ├── Private E2EE
│   ├── Secret Groups
│   └── Requests
│
├── Profile
│
├── Search
│
├── Notifications
│
├── Opportunities
│
├── Settings
│   ├── Account
│   ├── Privacy
│   ├── Security
│   ├── Devices
│   └── Notifications
│
└── Admin
```

---

# 27. Responsive Strategy

## Desktop

Three-column layout where appropriate.

## Tablet

Two-column layout.

## Mobile

Single primary content column.

Navigation becomes:

```text
Bottom Navigation
```

Messaging may use:

```text
Conversation List
      ↓
Conversation View
```

instead of side-by-side panels.

---

# 28. Frontend Architecture Decisions

## Decision 1

Next.js + React + TypeScript.

## Decision 2

Feature-first architecture.

## Decision 3

TanStack Query for server state.

## Decision 4

Zustand for client/UI state.

## Decision 5

Socket.IO client for current Nexus real-time messaging architecture.

## Decision 6

REST + WebSocket hybrid.

## Decision 7

Design system before feature explosion.

## Decision 8

Frontend authorization is not security.

## Decision 9

E2EE is a separate cryptographic architecture.

## Decision 10

Use mature cryptographic implementations.

## Decision 11

Accessibility and performance are architecture concerns.

## Decision 12

Mobile support must be considered from the beginning.

---

# 29. Frontend Production Toolchain

Recommended:

```text
Next.js
React
TypeScript
Tailwind CSS
TanStack Query
Zustand
React Hook Form
Zod
Socket.IO Client
Playwright
Vitest
React Testing Library
MSW
ESLint
Prettier
pnpm
GitHub Actions
Sentry or equivalent
OpenTelemetry-compatible monitoring where useful
```

---

# 30. Frontend + Backend Integration Milestones

## Milestone 1

Authentication works.

## Milestone 2

Profile works.

## Milestone 3

Social graph works.

## Milestone 4

Feed works.

## Milestone 5

Servers work.

## Milestone 6

Channels work.

## Milestone 7

Cloud messaging works.

## Milestone 8

Reactions work.

## Milestone 9

Notifications work.

## Milestone 10

Privacy settings work.

## Milestone 11

Private E2EE messaging starts.

## Milestone 12

Secret groups.

## Milestone 13

Advanced media.

## Milestone 14

AI.

## Milestone 15

Production hardening.

---

# 31. What NOT to Build Too Early

Do not start with:

- E2EE before normal messaging is stable
- advanced animations before design system
- AI before core social features
- WebRTC before messaging architecture
- complex offline sync before basic cache works
- custom cryptography
- giant global Zustand store
- duplicated API logic inside components

---

# 32. Frontend Learning Strategy

Each new concept should be learned in this order:

1. First principles
2. ELI5
3. Real-world analogy
4. React implementation
5. Nexus implementation
6. Internal mechanics
7. Production architecture
8. Security implications
9. Performance implications
10. Testing
11. Common mistakes
12. Interview questions
13. Scaling

---

# 33. New Concepts You Will Learn

During frontend development:

- Next.js App Router
- Server Components
- Client Components
- Suspense
- Streaming
- hydration
- caching
- query invalidation
- optimistic updates
- WebSockets
- event-driven UI
- event reconciliation
- virtualization
- browser storage
- IndexedDB
- service workers
- PWA
- Web Workers
- Web Crypto
- E2EE
- Signal-style sessions
- device identity
- forward secrecy
- push notifications
- WebRTC
- media pipelines
- accessibility
- CSP
- frontend observability
- performance engineering

---

# 34. Recommended Order From Here

Do NOT jump randomly between features.

Recommended sequence:

```text
Backend API Contract Stable
        ↓
Frontend Foundation
        ↓
Design System
        ↓
Application Shell
        ↓
Authentication
        ↓
Users/Profile
        ↓
Social Graph
        ↓
Feed
        ↓
Servers
        ↓
Channels
        ↓
Cloud Messaging
        ↓
Reactions
        ↓
Notifications
        ↓
Privacy/Security UI
        ↓
E2EE Architecture
        ↓
Private Messaging
        ↓
Secret Groups
        ↓
Media
        ↓
Search
        ↓
AI
        ↓
Admin
        ↓
Performance
        ↓
Offline
        ↓
Production Hardening
```

---

# 35. Frontend Start Point

When the backend reaches the agreed frontend start gate, begin:

## Lecture F0.1

**Initialize Nexus Web Frontend Foundation**

Then proceed sequentially.

The first frontend implementation should NOT be the feed.

The first goal is to establish:

- project structure
- environment configuration
- design tokens
- API client
- error handling
- query provider
- state architecture
- route architecture
- reusable UI foundation

Only after that should feature development begin.

---

# 36. Final Architecture Vision

```text
                         NEXUS WEB
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          Next.js        UI System      App Router
             │
      ┌──────┼─────────────┐
      │      │             │
      ▼      ▼             ▼
   Features State       Realtime
      │      │             │
      │      │             ├── Socket.IO
      │      │             └── Events
      │      │
      │      ├── TanStack Query
      │      └── Zustand
      │
      ├── Feed
      ├── Servers
      ├── Messaging
      ├── Notifications
      ├── Search
      ├── Media
      ├── Profile
      └── E2EE
                │
                ▼
          Crypto Layer
                │
                ▼
        Secure Local Storage
                │
                ▼
          Backend / Relay
```

The long-term goal is a frontend that is:

- scalable
- secure
- real-time
- accessible
- responsive
- testable
- observable
- production-grade
- compatible with cloud messaging and E2EE messaging without mixing their security models.

---

# 37. Frontend Completion Definition

Frontend is not considered production-ready when all pages merely render.

A feature is complete only when it has:

- UI
- API integration
- state management
- loading state
- error state
- empty state
- permission behavior
- responsive behavior
- accessibility
- tests
- performance consideration
- analytics/observability where appropriate
- security review
- Git commit

For security-sensitive features such as E2EE, completion additionally requires:

- threat model
- cryptographic protocol review
- secure key storage
- device lifecycle handling
- recovery strategy
- verification UX
- multi-device behavior
- extensive interoperability/security testing

---

# 38. Relationship With Backend Roadmap

Backend remains the source of truth for:

- authorization
- validation
- persistence
- permissions
- security
- message lifecycle
- E2EE server envelopes
- notification generation

Frontend remains responsible for:

- presentation
- user interaction
- client state
- caching
- real-time UI
- local UX
- cryptographic client operations for E2EE
- accessibility
- responsive behavior

Neither layer should absorb responsibilities that belong to the other.

