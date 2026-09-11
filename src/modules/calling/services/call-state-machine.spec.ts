import { BadRequestException } from '@nestjs/common';

import { CallStateMachine } from './call-state-machine';
import { CallStatus } from '../types/calling.types';

describe('CallStateMachine', () => {
  it('follows the documented happy path', () => {
    const path = [
      CallStatus.CREATED,
      CallStatus.RINGING,
      CallStatus.ACCEPTED,
      CallStatus.CONNECTING,
      CallStatus.ACTIVE,
      CallStatus.ENDING,
      CallStatus.ENDED,
    ];

    for (let i = 1; i < path.length; i++) {
      expect(CallStateMachine.canReach(path[i - 1], path[i])).toBe(true);
    }
  });

  it('rejects an accept after the call ended (terminal state)', () => {
    expect(CallStateMachine.canReach(CallStatus.ENDED, CallStatus.ACTIVE)).toBe(false);
  });

  it('rejects ending a cancelled or rejected call', () => {
    expect(CallStateMachine.canReach(CallStatus.CANCELLED, CallStatus.ENDED)).toBe(false);
    expect(CallStateMachine.canReach(CallStatus.REJECTED, CallStatus.ENDED)).toBe(false);
  });

  it('rejects resurrecting a failed call', () => {
    expect(CallStateMachine.canReach(CallStatus.FAILED, CallStatus.CONNECTING)).toBe(false);
    expect(CallStateMachine.canReach(CallStatus.FAILED, CallStatus.ACTIVE)).toBe(false);
  });

  it('allows fast-forwarding through intermediate states (RINGING to ACTIVE)', () => {
    expect(CallStateMachine.canReach(CallStatus.RINGING, CallStatus.ACTIVE)).toBe(true);
  });

  it('allows declining and failure escapes from ringing', () => {
    expect(CallStateMachine.canReach(CallStatus.RINGING, CallStatus.REJECTED)).toBe(true);
    expect(CallStateMachine.canReach(CallStatus.RINGING, CallStatus.CANCELLED)).toBe(true);
    expect(CallStateMachine.canReach(CallStatus.RINGING, CallStatus.FAILED)).toBe(true);
  });

  it('assertReachable throws for illegal transitions', () => {
    expect(() =>
      CallStateMachine.assertReachable(CallStatus.ENDED, CallStatus.ACTIVE),
    ).toThrow(BadRequestException);
  });

  it('classifies terminal and live statuses', () => {
    expect(CallStateMachine.isTerminal(CallStatus.ENDED)).toBe(true);
    expect(CallStateMachine.isTerminal(CallStatus.FAILED)).toBe(true);
    expect(CallStateMachine.isTerminal(CallStatus.REJECTED)).toBe(true);
    expect(CallStateMachine.isTerminal(CallStatus.CANCELLED)).toBe(true);
    expect(CallStateMachine.isTerminal(CallStatus.RINGING)).toBe(false);
    expect(CallStateMachine.isTerminal(CallStatus.ACTIVE)).toBe(false);

    expect(CallStateMachine.isLive(CallStatus.ACTIVE)).toBe(true);
    expect(CallStateMachine.isLive(CallStatus.CONNECTING)).toBe(true);
    expect(CallStateMachine.isLive(CallStatus.ENDED)).toBe(false);
  });
});