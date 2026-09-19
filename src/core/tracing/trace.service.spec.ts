import { TraceService } from './trace.service';

describe('TraceService', () => {
  let service: TraceService;

  beforeEach(() => {
    service = new TraceService();
  });

  it('should return undefined when no trace context is active', () => {
    expect(service.getTraceId()).toBeUndefined();
    expect(service.getContext()).toBeUndefined();
  });

  it('should set and retrieve a trace id inside run()', () => {
    service.run({ traceId: 'trace-abc' }, () => {
      expect(service.getTraceId()).toBe('trace-abc');
    });
  });

  it('should return undefined outside run()', () => {
    service.run({ traceId: 'trace-abc' }, () => {
      // inside
    });
    expect(service.getTraceId()).toBeUndefined();
  });

  it('should propagate the trace id across nested async calls', async () => {
    await service.run(
      { traceId: 'trace-nested', parentId: 'span-1' },
      async () => {
        expect(service.getTraceId()).toBe('trace-nested');
        expect(service.getContext()).toEqual({
          traceId: 'trace-nested',
          parentId: 'span-1',
        });

        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(service.getTraceId()).toBe('trace-nested');
      },
    );
  });

  it('should not leak trace id between concurrent runs', async () => {
    const results: string[] = [];

    const task = (id: string) =>
      service.run({ traceId: id }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(service.getTraceId()!);
      });

    await Promise.all([task('trace-a'), task('trace-b'), task('trace-c')]);

    expect(results.sort()).toEqual(['trace-a', 'trace-b', 'trace-c']);
  });

  it('runCurrent should preserve the existing trace id', () => {
    service.run({ traceId: 'trace-outer', parentId: 'p1' }, () => {
      service.runCurrent(() => {
        expect(service.getTraceId()).toBe('trace-outer');
      });
    });
  });

  it('runCurrent should generate a new trace id if none is active', () => {
    service.runCurrent(() => {
      const id = service.getTraceId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id!.length).toBeGreaterThan(0);
    });
  });
});
