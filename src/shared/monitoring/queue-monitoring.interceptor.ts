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
export class QueueMonitoringInterceptor implements NestInterceptor {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    // Extract queue context
    const queueName = this.extractQueueName(context);
    const jobType = this.extractJobType(context);
    const tenantId = this.extractTenantId(context);

    // Start tracing span for queue job
    const span = this.tracingService.startSpan(
      `Queue ${queueName} ${jobType}`,
      {
        'queue.name': queueName,
        'queue.job_type': jobType,
        'queue.tenant_id': tenantId,
      },
    ) as unknown as {
      setAttributes: (attrs: Record<string, unknown>) => void;
      setStatus: (status: { code: number; message?: string }) => void;
      recordException: (err: unknown) => void;
      end: () => void;
    };

    // Increment jobs in progress
    this.prometheusService.setQueueJobsInProgress(queueName, 1);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Record Prometheus metrics
        this.prometheusService.recordQueueJob(
          queueName,
          jobType,
          duration,
          'success',
        );
        this.prometheusService.recordQueueJobProcessed(
          queueName,
          jobType,
          'success',
        );

        // Decrement jobs in progress
        this.prometheusService.setQueueJobsInProgress(queueName, 0);

        // Add span attributes
        span.setAttributes({
          'queue.duration_ms': duration,
          'queue.status': 'success',
        });

        span.setStatus({ code: 1 }); // OK
        span.end();
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;

        // Record Prometheus metrics
        this.prometheusService.recordQueueJob(
          queueName,
          jobType,
          duration,
          'failed',
        );
        this.prometheusService.recordQueueJobProcessed(
          queueName,
          jobType,
          'failed',
        );

        // Decrement jobs in progress
        this.prometheusService.setQueueJobsInProgress(queueName, 0);

        // Add span attributes
        const errMsg = error instanceof Error ? error.message : String(error);
        span.setAttributes({
          'queue.duration_ms': duration,
          'queue.status': 'failed',
          'queue.error': true,
          'queue.error.message': errMsg,
        });

        span.setStatus({ code: 2, message: errMsg }); // ERROR
        span.recordException(error);
        span.end();

        throw error;
      }),
    );
  }

  private extractQueueName(context: ExecutionContext): string {
    // Try to extract queue name from context
    const className = context.getClass().name;
    if (className.includes('Email')) return 'email';
    if (className.includes('Notification')) return 'notifications';
    return 'unknown';
  }

  private extractJobType(context: ExecutionContext): string {
    // Try to extract job type from method name
    const methodName = context.getHandler().name;
    if (methodName.includes('process')) return 'process';
    if (methodName.includes('send')) return 'send';
    if (methodName.includes('notify')) return 'notify';
    return 'unknown';
  }

  private extractTenantId(context: ExecutionContext): string | undefined {
    // Try to extract tenant ID from job data or context
    try {
      const request = context
        .switchToHttp()
        .getRequest<{ user?: { tenant_id?: string } }>();
      return request.user?.tenant_id;
    } catch {
      return undefined;
    }
  }
}
