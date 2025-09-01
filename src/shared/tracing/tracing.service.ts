/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-require-imports */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
// Dynamically require OpenTelemetry to avoid build failures if deps are optional

let otelApi: any;
try {
  otelApi = require('@opentelemetry/api');
} catch {
  otelApi = {
    trace: {
      getTracer: () => ({
        startSpan: () => ({
          setStatus: () => {},
          recordException: () => {},
          end: () => {},
        }),
      }),
      getActiveSpan: () => undefined,
      setSpan: (_ctx: any, span: any) => span,
    },
    context: { active: () => ({}) },
    SpanStatusCode: { OK: 1, ERROR: 2 },
  };
}

let Resource: any;
try {
  Resource = require('@opentelemetry/resources').Resource;
} catch {
  Resource = class {
    constructor() {}
  };
}

let SemanticResourceAttributes: any;
try {
  SemanticResourceAttributes =
    require('@opentelemetry/semantic-conventions').SemanticResourceAttributes;
} catch {
  SemanticResourceAttributes = {};
}

let NodeTracerProvider: any;
try {
  NodeTracerProvider =
    require('@opentelemetry/sdk-trace-node').NodeTracerProvider;
} catch {
  NodeTracerProvider = class {
    addSpanProcessor() {}
    register() {}
    shutdown() {}
  };
}

let BatchSpanProcessor: any;
try {
  BatchSpanProcessor =
    require('@opentelemetry/sdk-trace-base').BatchSpanProcessor;
} catch {
  BatchSpanProcessor = class {};
}

let JaegerExporter: any;
try {
  JaegerExporter = require('@opentelemetry/exporter-jaeger').JaegerExporter;
} catch {
  JaegerExporter = class {};
}

let registerInstrumentations: any;
try {
  registerInstrumentations =
    require('@opentelemetry/instrumentation').registerInstrumentations;
} catch {
  registerInstrumentations = () => {};
}

let HttpInstrumentation: any;
try {
  HttpInstrumentation =
    require('@opentelemetry/instrumentation-http').HttpInstrumentation;
} catch {
  HttpInstrumentation = class {};
}

let ExpressInstrumentation: any;
try {
  ExpressInstrumentation =
    require('@opentelemetry/instrumentation-express').ExpressInstrumentation;
} catch {
  ExpressInstrumentation = class {};
}

let TypeORMInstrumentation: any;
try {
  TypeORMInstrumentation =
    require('@opentelemetry/instrumentation-typeorm').TypeORMInstrumentation;
} catch {
  TypeORMInstrumentation = class {};
}

let RedisInstrumentation: any;
try {
  RedisInstrumentation =
    require('@opentelemetry/instrumentation-redis').RedisInstrumentation;
} catch {
  RedisInstrumentation = class {};
}

@Injectable()
export class TracingService implements OnModuleDestroy {
  public tracer: any;
  private provider: any;

  constructor() {
    if (process.env.NODE_ENV !== 'test') {
      // Initialize OpenTelemetry
      this.provider = new NodeTracerProvider({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: 'task-manager-api',
          [SemanticResourceAttributes.SERVICE_VERSION]:
            process.env.npm_package_version || '1.0.0',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
            process.env.NODE_ENV || 'development',
        }),
      });

      // Configure Jaeger exporter
      const jaegerExporter = new JaegerExporter({
        endpoint:
          process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      });

      // Add span processor
      this.provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

      // Register the provider
      this.provider.register();

      // Register instrumentations
      registerInstrumentations({
        instrumentations: [
          new HttpInstrumentation(),
          new ExpressInstrumentation(),
          new TypeORMInstrumentation(),
          new RedisInstrumentation(),
        ],
      });
    }

    this.tracer = otelApi.trace.getTracer('task-manager-api');
  }

  async onModuleDestroy() {
    if (this.provider) {
      await this.provider.shutdown();
    }
  }

  // Create a new span
  startSpan(name: string, attributes?: Record<string, any>): any {
    const currentSpan = otelApi.trace.getActiveSpan();
    const span = this.tracer.startSpan(
      name,
      { attributes },
      currentSpan
        ? otelApi.trace.setSpan(otelApi.context.active(), currentSpan)
        : undefined,
    );
    return span;
  }

  // Start a span and execute a function
  async traceAsync<T>(
    name: string,
    fn: (span: any) => Promise<T>,
    attributes?: Record<string, any>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);

    try {
      const result = await fn(span);
      span.setStatus({ code: otelApi.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: otelApi.SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Add attributes to current span
  addAttributes(attributes: Record<string, any>): void {
    const currentSpan = otelApi.trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  // Add events to current span
  addEvent(name: string, attributes?: Record<string, any>): void {
    const currentSpan = otelApi.trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  // Set span status
  setStatus(code: any, message?: string): void {
    const currentSpan = otelApi.trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setStatus({ code, message });
    }
  }

  // Get current trace ID
  getCurrentTraceId(): string | undefined {
    const currentSpan = otelApi.trace.getActiveSpan();
    return currentSpan?.spanContext().traceId;
  }

  // Get current span ID
  getCurrentSpanId(): string | undefined {
    const currentSpan = otelApi.trace.getActiveSpan();
    return currentSpan?.spanContext().spanId;
  }

  // Create a child span
  createChildSpan(name: string, attributes?: Record<string, any>): any {
    const currentSpan = otelApi.trace.getActiveSpan();
    if (!currentSpan) {
      return this.startSpan(name, attributes);
    }
    return this.tracer.startSpan(
      name,
      { attributes },
      otelApi.trace.setSpan(otelApi.context.active(), currentSpan),
    );
  }
}
