import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { FEATURE_FLAG_KEY } from './feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const flagKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!flagKey) {
      return true; // No feature flag required
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { user_id?: string } }>();
    const tenantId = this.tenantContext.getTenantId();
    const userId = request.user?.user_id;

    return this.featureFlags.isEnabled(flagKey, {
      tenantId,
      userId,
      rolloutId: userId || tenantId,
    });
  }
}
