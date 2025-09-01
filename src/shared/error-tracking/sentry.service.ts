import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TracingService } from '../tracing/tracing.service';

// Minimal typed surface for the Sentry client we actually use
type SentryTransaction = { finish: () => void };
type SentryClient = {
  init: (options: unknown) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: {
    id: string;
    email?: string;
    ip_address?: string;
    extras?: Record<string, unknown>;
  }) => void;
  setExtra: (key: string, value: unknown) => void;
  addBreadcrumb: (breadcrumb: unknown) => void;
  configureScope: (callback: (scope: unknown) => void) => void;
  getCurrentHub: () => unknown;
  startTransaction: (options: {
    name: string;
    op: string;
  }) => SentryTransaction;
  captureException: (
    exception: unknown,
    options?: {
      extra?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ) => string;
  captureMessage: (
    message: string,
    options?: {
      level?: string;
      extra?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ) => string;
  close: (timeout?: number) => Promise<void>;
};

let Sentry: SentryClient;
let ProfilingIntegration: new () => unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sentryMod = require('@sentry/node') as SentryClient;
  Sentry = sentryMod;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const profiling = require('@sentry/profiling-node') as {
    ProfilingIntegration: new () => unknown;
  };
  ProfilingIntegration = profiling.ProfilingIntegration;
} catch {
  Sentry = {
    init: () => undefined,
    setTag: () => undefined,
    setUser: () => undefined,
    setExtra: () => undefined,
    addBreadcrumb: () => undefined,
    configureScope: () => undefined,
    getCurrentHub: () => ({}),
    startTransaction: () => ({ finish: () => undefined }),
    captureException: () => 'mock-id',
    captureMessage: () => 'mock-id',
    close: () => Promise.resolve(),
  };
  ProfilingIntegration = class {} as unknown as new () => unknown;
}

@Injectable()
export class SentryService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly tracingService: TracingService) {}

  onModuleInit(): void {
    // Initialize Sentry only if DSN is provided
    if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',

        // Performance monitoring
        integrations: [new ProfilingIntegration()],

        // Set traces sample rate
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Set profiles sample rate
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Enable debug in development
        debug: process.env.NODE_ENV === 'development',

        // Configure beforeSend to filter sensitive data
        beforeSend: (event: unknown, hint: unknown) => {
          const e = event as Record<string, unknown>;
          // Remove sensitive information
          const req = e.request as
            | undefined
            | {
                headers?: Record<string, unknown>;
              };
          if (req && req.headers && typeof req.headers === 'object') {
            if ('authorization' in req.headers) {
              delete req.headers.authorization;
            }
            if ('cookie' in req.headers) {
              delete req.headers.cookie;
            }
          }

          // Add correlation ID from tracing when originalException exists
          const h = hint as { originalException?: unknown } | undefined;
          if (h?.originalException) {
            const traceId = this.tracingService.getCurrentTraceId();
            if (traceId) {
              const withTags = e as { tags?: Record<string, unknown> };
              const tagsObj: Record<string, unknown> =
                (withTags.tags as Record<string, unknown>) ?? {};
              tagsObj.trace_id = traceId;
              withTags.tags = tagsObj;
            }
          }
          return e;
        },
      });

      // Set user context if available
      Sentry.setTag('service', 'task-manager-api');
    }
  }

  async onModuleDestroy() {
    // Flush any pending events
    await Sentry.close(2000);
  }

  // Capture exception
  captureException(
    exception: Error,
    context?: Record<string, unknown>,
  ): string {
    const tags: Record<string, string> = {};
    const traceId = this.tracingService.getCurrentTraceId();
    const spanId = this.tracingService.getCurrentSpanId();
    if (traceId) tags.trace_id = traceId;
    if (spanId) tags.span_id = spanId;
    return Sentry.captureException(exception, {
      extra: context,
      tags,
    });
  }

  // Capture message
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
    context?: Record<string, unknown>,
  ): string {
    const tags: Record<string, string> = {};
    const traceId = this.tracingService.getCurrentTraceId();
    const spanId = this.tracingService.getCurrentSpanId();
    if (traceId) tags.trace_id = traceId;
    if (spanId) tags.span_id = spanId;
    return Sentry.captureMessage(message, {
      level,
      extra: context,
      tags,
    });
  }

  // Set user context
  setUser(user: {
    id: string;
    email?: string;
    tenantId?: string;
    role?: string;
  }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      ip_address: '{{auto}}',
      extras: {
        tenant_id: user.tenantId,
        role: user.role,
      },
    });
  }

  // Set tag
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  // Set extra context
  setExtra(key: string, value: unknown): void {
    Sentry.setExtra(key, value);
  }

  // Start performance transaction
  startTransaction(name: string, operation: string): SentryTransaction {
    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb: unknown): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  // Configure scope
  configureScope(callback: (scope: unknown) => void): void {
    Sentry.configureScope(callback);
  }

  // Get current hub
  getCurrentHub(): unknown {
    return Sentry.getCurrentHub();
  }
}
