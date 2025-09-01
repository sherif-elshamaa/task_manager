import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let tenantContextService: TenantContextService;
  let reflector: Reflector;

  const mockExecutionContext = () =>
    ({
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: TenantContextService,
          useValue: {
            getRoles: jest.fn(),
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

    guard = module.get<RolesGuard>(RolesGuard);
    tenantContextService = module.get<TenantContextService>(TenantContextService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = mockExecutionContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    jest.spyOn(tenantContextService, 'getRoles').mockReturnValue(['admin']);
    const context = mockExecutionContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    jest.spyOn(tenantContextService, 'getRoles').mockReturnValue(['member']);
    const context = mockExecutionContext();
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access if user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    jest.spyOn(tenantContextService, 'getRoles').mockReturnValue([]);
    const context = mockExecutionContext();
    expect(guard.canActivate(context)).toBe(false);
  });
});
