import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { IS_PUBLIC_KEY } from '../public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // public routes bypass tenancy
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    // Basic presence check. Controllers/services should also validate resource tenant ownership.
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { tenant_id?: string } }>();
    const tenantId = this.tenantContext.getTenantId();
    return Boolean(tenantId || req.user?.tenant_id);
  }
}
