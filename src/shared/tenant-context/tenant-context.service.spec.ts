import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService, TenantContext } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContextService],
    }).compile();

    service = module.get(TenantContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('runWithContext sets and retrieves values', () => {
    const ctx: TenantContext = {
      tenantId: 't1',
      userId: 'u1',
      roles: ['admin'],
    };
    service.runWithContext(ctx, () => {
      expect(service.getTenantId()).toBe('t1');
      expect(service.getUserId()).toBe('u1');
      expect(service.getRoles()).toEqual(['admin']);
    });
  });

  it('getters return defaults when no context', () => {
    expect(service.getTenantId()).toBeUndefined();
    expect(service.getUserId()).toBeUndefined();
    expect(service.getRoles()).toEqual([]);
  });
});
