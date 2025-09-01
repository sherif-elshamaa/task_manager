import { Test, TestingModule } from '@nestjs/testing';
import { SentryService } from './sentry.service';
import { TracingService } from '../tracing/tracing.service';

describe('SentryService', () => {
  let service: SentryService;
  const mockTracing = {
    getCurrentTraceId: jest.fn().mockReturnValue('trace-1'),
    getCurrentSpanId: jest.fn().mockReturnValue('span-1'),
  } as unknown as TracingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryService,
        { provide: TracingService, useValue: mockTracing },
      ],
    }).compile();

    service = module.get(SentryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('captures exception and returns id', () => {
    const id = service.captureException(new Error('boom'), { foo: 'bar' });
    expect(typeof id).toBe('string');
  });

  it('captures message and returns id', () => {
    const id = service.captureMessage('hello', 'info', { a: 1 });
    expect(typeof id).toBe('string');
  });

  it('sets user, tag, extra without throwing', () => {
    expect(() =>
      service.setUser({
        id: 'u1',
        email: 'a@b.com',
        tenantId: 't1',
        role: 'admin',
      }),
    ).not.toThrow();
    expect(() => service.setTag('k', 'v')).not.toThrow();
    expect(() => service.setExtra('k', 'v')).not.toThrow();
  });

  it('starts transaction without throwing', () => {
    expect(() => service.startTransaction('name', 'op')).not.toThrow();
  });

  it('adds breadcrumb, configures scope, gets hub', () => {
    expect(() => service.addBreadcrumb({ message: 'm' })).not.toThrow();
    expect(() => service.configureScope(() => {})).not.toThrow();
    expect(service.getCurrentHub()).toBeDefined();
  });
});
