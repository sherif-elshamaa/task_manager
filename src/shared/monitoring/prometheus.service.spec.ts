import { Test, TestingModule } from '@nestjs/testing';
import { PrometheusService } from './prometheus.service';

describe('PrometheusService', () => {
  let service: PrometheusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrometheusService],
    }).compile();

    service = module.get(PrometheusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('records http metrics', () => {
    expect(() =>
      service.recordHttpRequest('GET', '/path', 200, 't1'),
    ).not.toThrow();
    expect(() =>
      service.recordHttpRequestDuration('GET', '/path', 123, 't1'),
    ).not.toThrow();
    expect(() =>
      service.setHttpRequestsInProgress('GET', '/path', 1),
    ).not.toThrow();
  });

  it('records db metrics', () => {
    expect(() =>
      service.recordDbQuery('SELECT', 'users', 12, 't1'),
    ).not.toThrow();
    expect(() => service.setDbConnectionsActive(10)).not.toThrow();
    expect(() => service.recordDbConnection('success')).not.toThrow();
  });

  it('records business metrics', () => {
    expect(() => service.recordTaskCreated('t1', 'p1', 'high')).not.toThrow();
    expect(() => service.recordProjectCreated('t1', 'w1')).not.toThrow();
    expect(() => service.setUsersActive('t1', 'admin', 3)).not.toThrow();
    expect(() => service.setTenantsActive(5)).not.toThrow();
  });

  it('records queue metrics', () => {
    expect(() =>
      service.recordQueueJob('main', 'email', 500, 'success'),
    ).not.toThrow();
    expect(() =>
      service.recordQueueJobProcessed('main', 'email', 'failed'),
    ).not.toThrow();
    expect(() => service.setQueueJobsInProgress('main', 2)).not.toThrow();
  });

  it('get metrics string', async () => {
    const metrics = await service.getMetrics();
    expect(typeof metrics).toBe('string');
  });

  it('get registry', () => {
    const reg = service.getRegistry();
    expect(reg).toBeDefined();
  });
});
