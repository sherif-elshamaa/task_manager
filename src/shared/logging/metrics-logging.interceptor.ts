import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { PrometheusService } from '../monitoring/prometheus.service';
import { TracingService } from '../tracing/tracing.service';
import { SentryService } from '../error-tracking/sentry.service';

type ReqWithUser = Request & {
  user?: {
    user_id?: string;
    email?: string;
    tenant_id?: string;
    role?: string;
  };
};

@Injectable()
export class MetricsLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsLoggingInterceptor.name);

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly tracingService: TracingService,
    private readonly sentryService: SentryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<ReqWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const method = request.method;
    const path = this.normalizePath(request.url);
    const userAgent = request.get('User-Agent') || 'unknown';
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    // Extract user context if available
    const userId = request.user?.user_id;
    const tenantId = request.user?.tenant_id;

    // Start tracing span
    const span = this.tracingService.startSpan(`HTTP ${method} ${path}`, {
      'http.method': method,
      'http.url': request.url,
      'http.user_agent': userAgent,
      'http.client_ip': ip,
      'user.id': userId,
      'tenant.id': tenantId,
    }) as unknown as {
      setAttributes: (attrs: Record<string, unknown>) => void;
      setStatus: (status: { code: number; message?: string }) => void;
      recordException: (err: unknown) => void;
      end: () => void;
    };

    // Set user context in Sentry
    if (userId) {
      this.sentryService.setUser({
        id: userId,
        email: request.user?.email,
        tenantId,
        role: request.user?.role,
      });
    }

    // Increment requests in progress
    this.prometheusService.setHttpRequestsInProgress(method, path, 1);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Record Prometheus metrics
        this.prometheusService.recordHttpRequest(
          method,
          path,
          statusCode,
          tenantId,
        );
        this.prometheusService.recordHttpRequestDuration(
          method,
          path,
          duration,
          tenantId,
        );

        // Decrement requests in progress
        this.prometheusService.setHttpRequestsInProgress(method, path, 0);

        // Add span attributes
        span.setAttributes({
          'http.status_code': statusCode,
          'http.response_time_ms': duration,
        });

        // Log successful response
        this.logger.log({
          message: 'Request completed',
          method,
          path,
          statusCode,
          duration,
          userId,
          tenantId,
          traceId: this.tracingService.getCurrentTraceId(),
        });

        span.setStatus({ code: 1 }); // OK
        span.end();
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;
        const statusCode =
          typeof error === 'object' &&
          error &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
            ? ((error as { status?: number }).status ?? 500)
            : 500;

        // Record Prometheus metrics
        this.prometheusService.recordHttpRequest(
          method,
          path,
          statusCode,
          tenantId,
        );
        this.prometheusService.recordHttpRequestDuration(
          method,
          path,
          duration,
          tenantId,
        );

        // Decrement requests in progress
        this.prometheusService.setHttpRequestsInProgress(method, path, 0);

        // Add span attributes
        const errName =
          typeof error === 'object' &&
          error &&
          'name' in error &&
          typeof (error as { name?: unknown }).name === 'string'
            ? (error as { name?: string }).name
            : 'Error';
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack =
          typeof error === 'object' &&
          error &&
          'stack' in error &&
          typeof (error as { stack?: unknown }).stack === 'string'
            ? (error as { stack?: string }).stack
            : undefined;
        span.setAttributes({
          'http.status_code': statusCode,
          'http.response_time_ms': duration,
          error: true,
          'error.message': errMsg,
        });

        // Capture error in Sentry
        this.sentryService.captureException(new Error(errMsg), {
          method,
          path,
          statusCode,
          duration,
          userId,
          tenantId,
        });

        // Log error response
        const logPayload = {
          message: 'Request failed',
          method,
          path,
          statusCode,
          duration,
          userId,
          tenantId,
          error: {
            name: errName,
            message: errMsg,
            stack: errStack,
          },
          traceId: this.tracingService.getCurrentTraceId(),
        };

        if (statusCode >= 500) {
          this.logger.error(logPayload);
        } else {
          this.logger.warn(logPayload);
        }

        span.setStatus({ code: 2, message: errMsg }); // ERROR
        span.recordException(error);
        span.end();

        throw error;
      }),
    );
  }

  private normalizePath(url: string): string {
    // Normalize paths for metrics (e.g., /users/123 -> /users/:id)
    return url
      .split('?')[0] // Remove query parameters
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      ) // Replace UUIDs
      .replace(/\/[0-9]+/g, '/:id'); // Replace numeric IDs
  }
}
