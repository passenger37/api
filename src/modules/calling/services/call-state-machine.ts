import { BadRequestException, Injectable } from '@nestjs/common';

import { CallStatus } from '../types/calling.types';

/**
 * The documented Calling state machine:
 *
 * ```text
 * CREATED
 *   ↓
 * RINGING
 *   ↓
 * ACCEPTED
 *   ↓
 * CONNECTING
 *   ↓
 * ACTIVE
 *   ↓
 * ENDING
 *   ↓
 * ENDED
 *
 * REJECTED
 * CANCELLED
 * FAILED
 * ```
 *
 * REFERENCE: docs/architecture/calling/signaling.md (state transitions),
 * docs/architecture/calling/failure-handling.md (terminal states).
 *
 * Commands are allowed to fast-forward through intermediate states (e.g. a DM
 * call may jump RINGING → ACTIVE when the callee accepts and media is on the
 * wire), but `assertReachable` guarantees the requested transition is on a
 * valid path *through the documented machine*. Invalid transitions — accept
 * after a call ended, end a cancelled call, camera-on for a voice call, ICE
 * candidate from a non-participant — are rejected server-side.
 */
@Injectable()
export class CallStateMachine {
  private static readonly TRANSITIONS: Record<CallStatus, CallStatus[]> = {
    // A call is created, then rings the callee(s).
    CREATED: [CallStatus.RINGING, CallStatus.FAILED],
    // The callee answers; either party may also decline while ringing.
    RINGING: [
      CallStatus.ACCEPTED,
      CallStatus.REJECTED,
      CallStatus.CANCELLED,
      CallStatus.FAILED,
    ],
    // Answer accepted — media negotiation may begin. Callee may still bail.
    ACCEPTED: [
      CallStatus.CONNECTING,
      CallStatus.REJECTED,
      CallStatus.CANCELLED,
      CallStatus.FAILED,
    ],
    // Peers are establishing the peer connection.
    CONNECTING: [CallStatus.ACTIVE, CallStatus.FAILED, CallStatus.ENDED],
    // Live call. Something ended it or it failed.
    ACTIVE: [CallStatus.ENDING, CallStatus.FAILED],
    // Graceful teardown in progress.
    ENDING: [CallStatus.ENDED, CallStatus.FAILED],
    ENDED: [],
    FAILED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  private static readonly TERMINAL: ReadonlySet<CallStatus> = new Set([
    CallStatus.ENDED,
    CallStatus.FAILED,
    CallStatus.REJECTED,
    CallStatus.CANCELLED,
  ]);

  /** Call statuses that still have an in-flight/potential session. */
  private static readonly LIVE: ReadonlySet<CallStatus> = new Set<CallStatus>([
    CallStatus.CREATED,
    CallStatus.RINGING,
    CallStatus.ACCEPTED,
    CallStatus.CONNECTING,
    CallStatus.ACTIVE,
  ]);

  static isTerminal(status: string): boolean {
    return CallStateMachine.TERMINAL.has(status as CallStatus);
  }

  static isLive(status: string): boolean {
    return CallStateMachine.LIVE.has(status as CallStatus);
  }

  /** Whether `from` can reach `to` through valid machine transitions (incl. self-loop). */
  static canReach(from: string, to: string): boolean {
    if (from === to) {
      return true;
    }
    const visited = new Set<string>();
    const queue: string[] = [from];
    visited.add(from);

    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const next of CallStateMachine.TRANSITIONS[current as CallStatus] ?? []) {
        if (next === to) {
          return true;
        }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return false;
  }

  /** Throws when `from` cannot legally reach `to`. */
  static assertReachable(from: string, to: string): void {
    if (!CallStateMachine.canReach(from, to)) {
      throw new BadRequestException(
        `INVALID_CALL_TRANSITION: cannot move a call from ${from} to ${to}.`,
      );
    }
  }
}