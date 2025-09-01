import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from './tenant-context.service';

interface JwtPayload {
  sub: string;
  email?: string;
  tenantId?: string;
  roles?: string[];
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = this.jwtService.verify<JwtPayload>(token);

        if (payload && payload.tenantId) {
          // Attach to request for controllers/guards
          const reqWithUser = req as unknown as { user?: unknown };
          reqWithUser.user = {
            user_id: payload.sub,
            email: payload.email,
            tenant_id: payload.tenantId,
            roles: payload.roles || [],
          };

          // Initialize request-scoped tenant context
          this.tenantContextService.runWithContext(
            {
              tenantId: payload.tenantId,
              userId: payload.sub,
              email: payload.email!,
              roles: payload.roles || [],
            },
            () => next(),
          );
          return; // next() already called within runWithContext
        }
      }
    } catch (_error) {
      void _error;
      // JWT verification failed, continue without tenant context
      // The guards will handle authentication/authorization
    }

    next();
  }
}
