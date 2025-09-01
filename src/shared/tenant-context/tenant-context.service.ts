import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId: string;
  email: string;
  roles: string[];
}

export const TENANT_CONTEXT_KEY = 'tenantContext';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  runWithContext<T>(ctx: TenantContext, callback: () => T): T {
    return this.storage.run(ctx, callback);
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  getRoles(): string[] {
    return this.storage.getStore()?.roles ?? [];
  }

  getEmail(): string | undefined {
    return this.storage.getStore()?.email;
  }
}
