import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserPayload = {
  sub?: string;
  user_id?: string;
  tenant_id?: string;
  tenantId?: string; // JWT uses camelCase
  email?: string;
  role?: string;
  roles?: string[];
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return req.user;
  },
);

export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return req.user?.tenant_id;
  },
);

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return req.user?.sub;
  },
);
