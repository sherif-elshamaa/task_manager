import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from './tenant.guard';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../public.decorator';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let tenantContextService: TenantContextService;
  let reflector: Reflector;

  const mockExecutionContext = (user: any, isPublic = false) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
    tenantContextService = module.get<TenantContextService>(TenantContextService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access for public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = mockExecutionContext(null, true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if tenantId is in context', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue('test-tenant');
    const context = mockExecutionContext({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if tenant_id is in request user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(undefined);
    const context = mockExecutionContext({ tenant_id: 'test-tenant' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if no tenant info is available', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(undefined);
    const context = mockExecutionContext({});
    expect(guard.canActivate(context)).toBe(false);
  });
});
