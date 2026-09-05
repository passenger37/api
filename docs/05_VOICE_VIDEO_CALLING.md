# Nexus --- Voice & Video Calling

## Status

-   **Completed** — Commit: `3a5f04f feat(calling): voice & video calling module`
-   Media technology: WebRTC
-   Signaling: NestJS + Socket.IO
-   Media transport: WebRTC, not Socket.IO

## Supported Scope

``` text
1:1
├── Voice
└── Video

Groups
├── Voice
└── Video

Server Channels
├── Voice
└── Video / Live

Communities
└── Live / discussion rooms

Anonymous Chat
└── Optional future voice/video
```

## High-Level Architecture

``` text
             Nexus Signaling
            NestJS + Socket.IO
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
     User A       User B       User C
       │            │            │
       └──────── WebRTC ────────┘
                    │
               STUN / TURN
                    │
                Media Path
```

## Critical Decision

Socket.IO handles: - call state - participant state - SDP exchange - ICE
candidate exchange - signaling

WebRTC handles: - microphone - camera - audio/video media - peer/media
transport

Never send raw audio/video through Socket.IO.

## Call Domain

``` text
Call
- id
- type
- scope
- creatorUserId
- status
- startedAt
- endedAt

CallParticipant
- callId
- userId
- deviceId
- joinedAt
- leftAt
- state
```

Do not persist raw media as part of the call domain.

## Signaling Events

``` text
call:create
call:ring
call:accept
call:reject
call:cancel
call:end

webrtc:offer
webrtc:answer
webrtc:ice-candidate

call:mute
call:unmute
call:camera-on
call:camera-off

call:participant-joined
call:participant-left
```

## STUN/TURN

STUN helps discover reachable network addresses. TURN relays media when
direct connectivity fails.

Production TURN must support short-lived credentials, bandwidth
controls, geographic placement and abuse prevention.

## Group Calling

Small groups may use peer-to-peer mesh.

Larger groups should use an SFU.

``` text
Clients
   │
   ▼
  SFU
 ┌─┼─┐
 A B C
```

Potential technologies to benchmark before locking: - mediasoup -
LiveKit - Janus

Do not lock the final SFU without performance and operational
evaluation.

## Server Voice Channels

Reuse ServerPermission concepts for: - join - speak - publish video -
screen share - moderation

## Recording

Recording is a separate feature requiring: - explicit consent - visible
recording indicator - access control - encryption - retention policy -
audit trail

Never silently record.

## Lecture Flow

54.1 WebRTC Fundamentals 54.2 Call Domain Architecture 54.3 Signaling
54.4 SDP 54.5 ICE 54.6 STUN 54.7 TURN 54.8 1:1 Voice 54.9 1:1 Video
54.10 Group Calling 54.11 SFU Architecture 54.12 Server Voice Channels
54.13 Video Channels 54.14 Screen Sharing 54.15 Network Adaptation 54.16
Call Recovery 54.17 Observability 54.18 Load Testing 54.19 Production
Hardening

## Security

Authenticated signaling, authorization before joining, WebRTC DTLS/SRTP,
short-lived TURN credentials, room access control and abuse/rate limits.

## Failure Handling

Handle network switching, backgrounding, refresh, participant
disconnect, TURN failure, ICE restart, server restart and duplicate
signaling.

## Definition of Done

1:1 voice/video, group calling, server voice/video channels,
permissions, TURN, recovery, observability, load testing and security
review.
