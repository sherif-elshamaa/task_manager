import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard } from './feature-flag.guard';
import { FeatureFlagsService } from './feature-flags.service';
import { TenantContextService } from '../tenant-context/tenant-context.service';

describe('FeatureFlagGuard', () => {
  let guard: FeatureFlagGuard;
  let reflector: Reflector;
  let featureFlagsService: FeatureFlagsService;
  let tenantContextService: TenantContextService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockFeatureFlagsService = {
    isEnabled: jest.fn(),
  };

  const mockTenantContextService = {
    getTenantId: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: { user_id: 'user_123' },
      }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: FeatureFlagsService,
          useValue: mockFeatureFlagsService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    guard = module.get<FeatureFlagGuard>(FeatureFlagGuard);
    reflector = module.get<Reflector>(Reflector);
    featureFlagsService = module.get<FeatureFlagsService>(FeatureFlagsService);
    tenantContextService =
      module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no feature flag is required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockFeatureFlagsService.isEnabled).not.toHaveBeenCalled();
    });

    it('should return true when feature flag is enabled', () => {
      const flagKey = 'advanced_analytics';
      const tenantId = 'tenant_123';
      const userId = 'user_123';

      mockReflector.getAllAndOverride.mockReturnValue(flagKey);
      mockTenantContextService.getTenantId.mockReturnValue(tenantId);
      mockFeatureFlagsService.isEnabled.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockFeatureFlagsService.isEnabled).toHaveBeenCalledWith(flagKey, {
        tenantId,
        userId,
        rolloutId: userId,
      });
    });

    it('should return false when feature flag is disabled', () => {
      const flagKey = 'ai_task_suggestions';
      const tenantId = 'tenant_123';
      const userId = 'user_123';

      mockReflector.getAllAndOverride.mockReturnValue(flagKey);
      mockTenantContextService.getTenantId.mockReturnValue(tenantId);
      mockFeatureFlagsService.isEnabled.mockReturnValue(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      expect(mockFeatureFlagsService.isEnabled).toHaveBeenCalledWith(flagKey, {
        tenantId,
        userId,
        rolloutId: userId,
      });
    });

    it('should use tenantId as rolloutId when userId is not available', () => {
      const flagKey = 'enhanced_security';
      const tenantId = 'tenant_123';

      mockReflector.getAllAndOverride.mockReturnValue(flagKey);
      mockTenantContextService.getTenantId.mockReturnValue(tenantId);
      mockFeatureFlagsService.isEnabled.mockReturnValue(true);

      // Mock request without user
      const contextWithoutUser = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(contextWithoutUser);

      expect(result).toBe(true);
      expect(mockFeatureFlagsService.isEnabled).toHaveBeenCalledWith(flagKey, {
        tenantId,
        userId: undefined,
        rolloutId: tenantId,
      });
    });

    it('should handle missing tenant context gracefully', () => {
      const flagKey = 'performance_monitoring';

      mockReflector.getAllAndOverride.mockReturnValue(flagKey);
      mockTenantContextService.getTenantId.mockReturnValue(null);
      mockFeatureFlagsService.isEnabled.mockReturnValue(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      expect(mockFeatureFlagsService.isEnabled).toHaveBeenCalledWith(flagKey, {
        tenantId: null,
        userId: 'user_123',
        rolloutId: 'user_123',
      });
    });
  });
});
