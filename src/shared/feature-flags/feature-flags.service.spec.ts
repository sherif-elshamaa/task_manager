import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return false for non-existent flag', () => {
      const result = service.isEnabled('non_existent_flag');
      expect(result).toBe(false);
    });

    it('should return true for enabled flag without rollout', () => {
      const result = service.isEnabled('real_time_collaboration');
      expect(result).toBe(true);
    });

    it('should return false for disabled flag', () => {
      const result = service.isEnabled('ai_task_suggestions');
      expect(result).toBe(false);
    });

    it('should respect tenant overrides', () => {
      const flagKey = 'advanced_analytics';
      const tenantId = 'tenant_123';

      service.setTenantOverride(flagKey, tenantId, true);

      const result = service.isEnabled(flagKey, { tenantId });
      expect(result).toBe(true);
    });

    it('should respect user overrides', () => {
      const flagKey = 'advanced_analytics';
      const userId = 'user_123';

      service.setUserOverride(flagKey, userId, true);

      const result = service.isEnabled(flagKey, { userId });
      expect(result).toBe(true);
    });

    it('should handle rollout percentage correctly', () => {
      const flagKey = 'enhanced_security';
      const userId = 'user_123';

      // Mock hash function to return predictable value
      jest.spyOn(service as any, 'hashString').mockReturnValue(10);

      const result = service.isEnabled(flagKey, { userId });
      expect(result).toBe(true); // 10 < 25% rollout
    });

    it('should prioritize tenant override over user override', () => {
      const flagKey = 'advanced_analytics';
      const tenantId = 'tenant_123';
      const userId = 'user_123';

      service.setTenantOverride(flagKey, tenantId, false);
      service.setUserOverride(flagKey, userId, true);

      const result = service.isEnabled(flagKey, { tenantId, userId });
      expect(result).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    it('should return all feature flags', () => {
      const flags = service.getAllFlags();
      expect(flags).toHaveLength(5);
      expect(flags.map((f) => f.key)).toContain('advanced_analytics');
      expect(flags.map((f) => f.key)).toContain('ai_task_suggestions');
    });
  });

  describe('getFlag', () => {
    it('should return specific flag', () => {
      const flag = service.getFlag('real_time_collaboration');
      expect(flag).toBeDefined();
      expect(flag?.key).toBe('real_time_collaboration');
      expect(flag?.enabled).toBe(true);
    });

    it('should return undefined for non-existent flag', () => {
      const flag = service.getFlag('non_existent');
      expect(flag).toBeUndefined();
    });
  });

  describe('updateFlag', () => {
    it('should update existing flag', () => {
      const result = service.updateFlag('advanced_analytics', {
        enabled: true,
      });
      expect(result).toBe(true);

      const flag = service.getFlag('advanced_analytics');
      expect(flag?.enabled).toBe(true);
    });

    it('should return false for non-existent flag', () => {
      const result = service.updateFlag('non_existent', { enabled: true });
      expect(result).toBe(false);
    });
  });

  describe('setTenantOverride', () => {
    it('should set tenant override for existing flag', () => {
      const result = service.setTenantOverride(
        'advanced_analytics',
        'tenant_123',
        true,
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent flag', () => {
      const result = service.setTenantOverride(
        'non_existent',
        'tenant_123',
        true,
      );
      expect(result).toBe(false);
    });
  });

  describe('setUserOverride', () => {
    it('should set user override for existing flag', () => {
      const result = service.setUserOverride(
        'advanced_analytics',
        'user_123',
        true,
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent flag', () => {
      const result = service.setUserOverride('non_existent', 'user_123', true);
      expect(result).toBe(false);
    });
  });

  describe('environment configuration', () => {
    it('should load flags from environment', async () => {
      const envFlags = JSON.stringify({
        advanced_analytics: true,
        ai_task_suggestions: true,
      });

      mockConfigService.get.mockReturnValue(envFlags);

      // Create new service instance to test initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = module.get<FeatureFlagsService>(FeatureFlagsService);

      const flag = newService.getFlag('advanced_analytics');
      expect(flag?.enabled).toBe(true);
    });

    it('should handle invalid environment configuration gracefully', async () => {
      mockConfigService.get.mockReturnValue('invalid json');

      // Should not throw error during initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = module.get<FeatureFlagsService>(FeatureFlagsService);
      expect(newService).toBeDefined();
    });
  });
});
