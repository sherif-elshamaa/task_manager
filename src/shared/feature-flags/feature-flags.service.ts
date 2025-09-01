import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  tenantOverrides?: Record<string, boolean>;
  userOverrides?: Record<string, boolean>;
}

@Injectable()
export class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeFlags();
  }

  private initializeFlags() {
    // Initialize default feature flags
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'advanced_analytics',
        enabled: false,
        description: 'Advanced analytics and reporting features',
        rolloutPercentage: 10,
      },
      {
        key: 'ai_task_suggestions',
        enabled: false,
        description: 'AI-powered task suggestions and automation',
        rolloutPercentage: 5,
      },
      {
        key: 'real_time_collaboration',
        enabled: true,
        description: 'Real-time collaboration features',
        rolloutPercentage: 100,
      },
      {
        key: 'enhanced_security',
        enabled: false,
        description: 'Enhanced security features and MFA',
        rolloutPercentage: 25,
      },
      {
        key: 'performance_monitoring',
        enabled: true,
        description: 'Performance monitoring and metrics',
        rolloutPercentage: 100,
      },
    ];

    // Load flags from environment or database
    const envFlags = this.configService.get<string>('FEATURE_FLAGS');
    if (envFlags) {
      try {
        const parsed = JSON.parse(envFlags) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const parsedFlags = parsed as Record<string, unknown>;
          defaultFlags.forEach((flag) => {
            const v = parsedFlags[flag.key];
            if (typeof v === 'boolean') {
              flag.enabled = v;
            }
          });
        }
      } catch (error) {
        console.warn('Failed to parse FEATURE_FLAGS from environment:', error);
      }
    }

    defaultFlags.forEach((flag) => {
      this.flags.set(flag.key, flag);
    });
  }

  isEnabled(
    flagKey: string,
    context?: {
      tenantId?: string;
      userId?: string;
      rolloutId?: string;
    },
  ): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return false;
    }

    // Check tenant-specific overrides
    if (
      context?.tenantId &&
      flag.tenantOverrides?.[context.tenantId] !== undefined
    ) {
      return flag.tenantOverrides[context.tenantId];
    }

    // Check user-specific overrides
    if (context?.userId && flag.userOverrides?.[context.userId] !== undefined) {
      return flag.userOverrides[context.userId];
    }

    // If globally enabled and no rollout gating, return true
    if (
      flag.enabled &&
      (flag.rolloutPercentage === undefined || flag.rolloutPercentage >= 100)
    ) {
      return true;
    }

    // Apply rollout percentage if defined (even when globally disabled)
    if (
      flag.rolloutPercentage !== undefined &&
      flag.rolloutPercentage >= 0 &&
      flag.rolloutPercentage <= 100
    ) {
      const rolloutId =
        context?.rolloutId || context?.userId || context?.tenantId || 'default';
      const hash = this.hashString(rolloutId + flagKey);
      const percentage = hash % 100;
      return percentage < flag.rolloutPercentage;
    }

    // Otherwise, fallback to global enabled flag
    return !!flag.enabled;
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey);
  }

  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return false;
    }

    Object.assign(flag, updates);
    this.flags.set(flagKey, flag);
    return true;
  }

  setTenantOverride(
    flagKey: string,
    tenantId: string,
    enabled: boolean,
  ): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return false;
    }

    if (!flag.tenantOverrides) {
      flag.tenantOverrides = {};
    }
    flag.tenantOverrides[tenantId] = enabled;
    return true;
  }

  setUserOverride(flagKey: string, userId: string, enabled: boolean): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return false;
    }

    if (!flag.userOverrides) {
      flag.userOverrides = {};
    }
    flag.userOverrides[userId] = enabled;
    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
