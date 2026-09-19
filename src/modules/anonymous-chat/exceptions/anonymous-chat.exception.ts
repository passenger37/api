import { HttpException, HttpStatus } from '@nestjs/common';

import { WebSocketException } from '../../../common/websocket/error/websocket.exception';
import { AnonymousChatErrorCode } from '../types/anonymous-chat.types';

/**
 * Domain exception for anonymous-chat failures. Carries a granular code that
 * the `WebSocketErrorNormalizer` surfaces verbatim to the anonymous gateway
 * (e.g. `ANONYMOUS_SESSION_NOT_FOUND`) instead of a generic 400.
 */
export class AnonymousChatException extends WebSocketException {
  constructor(code: AnonymousChatErrorCode, message: string) {
    super(code, message);
    this.name = 'AnonymousChatException';
  }
}

export const anonymousNotFound = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.SESSION_NOT_FOUND,
    'Anonymous session not found.',
  );

export const anonymousNotParticipant = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.NOT_PARTICIPANT,
    'You are not a participant of this anonymous session.',
  );

export const anonymousAlreadyActive = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.ALREADY_ACTIVE,
    'You already have an active anonymous session.',
  );

export const anonymousChatClosed = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.CHAT_CLOSED,
    'This anonymous session has already ended.',
  );

export const anonymousSessionExpired = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.SESSION_EXPIRED,
    'This anonymous session has expired.',
  );

export const anonymousMessageTooLarge = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.MESSAGE_TOO_LARGE,
    'Message exceeds the maximum allowed length.',
  );

export const anonymousMessageRateLimited = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.MESSAGE_RATE_LIMITED,
    'You are sending messages too quickly. Please slow down.',
  );

export const anonymousNotAllowed = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.NOT_ALLOWED,
    'Anonymous chat is not available for this account right now.',
  );

export const anonymousMatchUnavailable = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.MATCH_UNAVAILABLE,
    'No anonymous partner available right now. Try again shortly.',
  );

export const anonymousSkipCooldown = (
  retryAfterSeconds: number,
): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.SKIP_COOLDOWN,
    `You skipped too many partners. Try again in ${retryAfterSeconds} seconds.`,
  );

export const anonymousQueueRateLimited = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.QUEUE_RATE_LIMITED,
    'You joined the queue too frequently. Please slow down.',
  );

export const anonymousReportRateLimited = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.REPORT_RATE_LIMITED,
    'You submitted too many reports. Please slow down.',
  );

export const anonymousBlockRateLimited = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.BLOCK_RATE_LIMITED,
    'You blocked too many partners. Please slow down.',
  );

export const anonymousReconnectExpired = (): AnonymousChatException =>
  new AnonymousChatException(
    AnonymousChatErrorCode.RECONNECT_EXPIRED,
    'This anonymous session is no longer recoverable.',
  );

/**
 * Maps a domain exception to a REST `HttpException` for the HTTP surface.
 * Falls back to a 400 with the message for unknown errors.
 */
export function toHttpException(error: unknown): HttpException {
  if (error instanceof AnonymousChatException) {
    return new HttpException(
      { statusCode: 409, message: error.message, code: error.code },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof HttpException) {
    return error;
  }

  return new HttpException(
    'Anonymous chat request failed.',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
