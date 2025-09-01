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
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  userId?: string;
  tenantId?: string;
  duration: number;
  statusCode: number;
  error?: any;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { user_id?: string; tenant_id?: string } }
      >();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate correlation ID for request tracing
    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv4();
    request.headers['x-correlation-id'] = correlationId;

    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('User-Agent') || 'unknown';
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    // Extract user context if available
    const userId = request.user?.user_id;
    const tenantId = request.user?.tenant_id;

    // Log request start
    this.logger.log({
      message: 'Request started',
      correlationId,
      method,
      url,
      userAgent,
      ip,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful response
        this.logger.log({
          message: 'Request completed',
          correlationId,
          method,
          url,
          userAgent,
          ip,
          userId,
          tenantId,
          duration,
          statusCode,
          timestamp: new Date().toISOString(),
        });
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

        // Log error response
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
        this.logger.error({
          message: 'Request failed',
          correlationId,
          method,
          url,
          userAgent,
          ip,
          userId,
          tenantId,
          duration,
          statusCode,
          error: {
            name: errName,
            message: errMsg,
            stack: errStack,
          },
          timestamp: new Date().toISOString(),
        });

        throw error;
      }),
    );
  }
}
