import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WebSocketErrorNormalizer } from './websocket-error.normalizer';
import { WebSocketErrorCode } from './websocket-error-code.enum';
import { WebSocketException } from './websocket.exception';

describe('WebSocketErrorNormalizer', () => {
  let normalizer: WebSocketErrorNormalizer;

  beforeEach(() => {
    normalizer = new WebSocketErrorNormalizer();
  });

  it('should normalize WebSocketException', () => {
    const ex = new WebSocketException(
      WebSocketErrorCode.INVALID_PAYLOAD,
      'test',
    );
    const res = normalizer.normalize(ex, 'test.event');
    expect(res.success).toBe(false);
    expect(res.event).toBe('test.event');
    expect(res.error.code).toBe(WebSocketErrorCode.INVALID_PAYLOAD);
    expect(res.error.message).toBe('test');
  });

  it('should normalize BadRequestException', () => {
    const ex = new BadRequestException('bad');
    const res = normalizer.normalize(ex, 'event');
    expect(res.error.code).toBe(WebSocketErrorCode.INVALID_PAYLOAD);
  });

  it('should normalize UnauthorizedException', () => {
    const ex = new UnauthorizedException('unauth');
    const res = normalizer.normalize(ex, 'event');
    expect(res.error.code).toBe(WebSocketErrorCode.UNAUTHORIZED);
  });

  it('should normalize ForbiddenException', () => {
    const ex = new ForbiddenException('forbidden');
    const res = normalizer.normalize(ex, 'event');
    expect(res.error.code).toBe(WebSocketErrorCode.FORBIDDEN);
  });

  it('should normalize HttpException to INTERNAL_ERROR', () => {
    const ex = new HttpException('err', HttpStatus.TOO_MANY_REQUESTS);
    const res = normalizer.normalize(ex, 'event');
    expect(res.error.code).toBe(WebSocketErrorCode.INTERNAL_ERROR);
    expect(res.error.message).toBe('An unexpected error occurred.');
  });

  it('should normalize unknown error to INTERNAL_ERROR', () => {
    const res = normalizer.normalize(new Error('oops'), 'event');
    expect(res.error.code).toBe(WebSocketErrorCode.INTERNAL_ERROR);
  });
});
