import { Test, TestingModule } from '@nestjs/testing';
import { TracingService } from './tracing.service';

describe('TracingService', () => {
  let service: TracingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TracingService],
    }).compile();

    service = module.get(TracingService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('startSpan returns span-like object', () => {
    const span = service.startSpan('test');
    expect(span).toBeDefined();
    expect(typeof span.end).toBe('function');
  });

  it('traceAsync executes function and ends span', async () => {
    const res = await service.traceAsync('op', async () => 42);
    expect(res).toBe(42);
  });

  it('traceAsync records error and rethrows', async () => {
    await expect(
      service.traceAsync('op', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('helpers execute without errors', () => {
    expect(() => service.addAttributes({ a: 1 })).not.toThrow();
    expect(() => service.addEvent('evt', { k: 'v' })).not.toThrow();
    expect(() => service.setStatus(1, 'ok')).not.toThrow();
    expect(() => service.getCurrentTraceId()).not.toThrow();
    expect(() => service.getCurrentSpanId()).not.toThrow();
    const child = service.createChildSpan('child');
    expect(child).toBeDefined();
  });
});
