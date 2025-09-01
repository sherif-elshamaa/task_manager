import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrometheusService } from './prometheus.service';
import { TracingService } from '../tracing/tracing.service';

@Injectable()
export class DatabaseMonitoringInterceptor implements NestInterceptor {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    // Extract database operation context if available
    const operation = this.extractOperation(context);
    const table = this.extractTable(context);
    const tenantId = this.extractTenantId(context);

    // Start tracing span for database operation
    const span = this.tracingService.startSpan(`DB ${operation}`, {
      'db.operation': operation,
      'db.table': table,
      'db.tenant_id': tenantId,
    }) as unknown as {
      setAttributes: (attrs: Record<string, unknown>) => void;
      setStatus: (status: { code: number; message?: string }) => void;
      recordException: (err: unknown) => void;
      end: () => void;
    };

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        // Record Prometheus metrics
        this.prometheusService.recordDbQuery(
          operation,
          table,
          duration,
          tenantId,
        );

        // Add span attributes
        span.setAttributes({
          'db.duration_ms': duration,
          'db.rows_affected': this.extractRowsAffected(data),
        });

        span.setStatus({ code: 1 }); // OK
        span.end();
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;

        // Record Prometheus metrics
        this.prometheusService.recordDbQuery(
          operation,
          table,
          duration,
          tenantId,
        );

        // Add span attributes
        const errMsg = error instanceof Error ? error.message : String(error);
        span.setAttributes({
          'db.duration_ms': duration,
          'db.error': true,
          'db.error.message': errMsg,
        });

        span.setStatus({ code: 2, message: errMsg }); // ERROR
        span.recordException(error);
        span.end();

        throw error;
      }),
    );
  }

  private extractOperation(context: ExecutionContext): string {
    // Try to extract operation from method name or context
    const methodName = context.getHandler().name;
    if (methodName.includes('find')) return 'SELECT';
    if (methodName.includes('create') || methodName.includes('save'))
      return 'INSERT';
    if (methodName.includes('update')) return 'UPDATE';
    if (methodName.includes('delete') || methodName.includes('remove'))
      return 'DELETE';
    return 'UNKNOWN';
  }

  private extractTable(context: ExecutionContext): string {
    // Try to extract table name from context
    const className = context.getClass().name;
    if (className.includes('User')) return 'users';
    if (className.includes('Task')) return 'tasks';
    if (className.includes('Project')) return 'projects';
    if (className.includes('Workspace')) return 'workspaces';
    if (className.includes('Comment')) return 'comments';
    if (className.includes('Tenant')) return 'tenants';
    return 'unknown';
  }

  private extractTenantId(context: ExecutionContext): string | undefined {
    // Try to extract tenant ID from request context
    try {
      const request = context
        .switchToHttp()
        .getRequest<{ user?: { tenant_id?: string } }>();
      return request.user?.tenant_id;
    } catch {
      return undefined;
    }
  }

  private extractRowsAffected(data: unknown): number {
    // Try to extract rows affected from response
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if ('affected' in obj && typeof obj.affected === 'number') {
        return obj.affected;
      }
      if ('raw' in obj) {
        const raw = (obj as { raw: unknown }).raw;
        if (Array.isArray(raw)) return raw.length;
        return 1;
      }
    }
    return 1;
  }
}
