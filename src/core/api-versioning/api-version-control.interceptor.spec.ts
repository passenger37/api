import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ApiVersionControlService } from './api-version-control.service';
import { DeprecationHeaderInterceptor } from './api-version-control.interceptor';

describe('DeprecationHeaderInterceptor', () => {
  let versions: ApiVersionControlService;
  let interceptor: DeprecationHeaderInterceptor;
  let setHeader: jest.Mock;
  let handler: CallHandler;

  const mockHttp = (url: string, responseHeaders: Record<string, string>) => {
    const response = {
      setHeader: (name: string, value: string) => {
        responseHeaders[name] = value;
      },
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ url }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    return context;
  };

  beforeEach(() => {
    versions = new ApiVersionControlService();
    interceptor = new DeprecationHeaderInterceptor(versions);
    setHeader = jest.fn();
    handler = { handle: () => of({ ok: true }) };
  });

  it('adds deprecation headers for a deprecated /v1 request', (done) => {
    const headers: Record<string, string> = {};
    interceptor
      .intercept(mockHttp('/v1/api', headers), handler)
      .subscribe(() => {
        expect(headers['Deprecation']).toBe('true');
        expect(headers['Sunset']).toBeDefined();
        expect(headers['Link']).toContain('successor-version');
        done();
      });
  });

  it('leaves a current /v2 request header-free', (done) => {
    const headers: Record<string, string> = {};
    interceptor
      .intercept(mockHttp('/v2/api', headers), handler)
      .subscribe(() => {
        expect(headers).toEqual({});
        done();
      });
  });

  it('ignores non-versioned or non-http contexts', (done) => {
    const headers: Record<string, string> = {};
    const wsContext = {
      getType: () => 'ws',
      switchToHttp: () => {
        throw new Error('no http');
      },
    } as unknown as ExecutionContext;
    interceptor.intercept(wsContext, handler).subscribe(() => {
      interceptor
        .intercept(mockHttp('/health', headers), handler)
        .subscribe(() => {
          expect(headers).toEqual({});
          done();
        });
    });
  });
});
