import { registerAs } from '@nestjs/config';

export default registerAs('monitoring', () => ({
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED !== 'false',
    port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10) || 9090,
    path: process.env.PROMETHEUS_PATH || '/metrics',
  },
  tracing: {
    enabled: process.env.TRACING_ENABLED !== 'false',
    jaeger: {
      endpoint:
        process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      serviceName: process.env.JAEGER_SERVICE_NAME || 'task-manager-api',
      environment: process.env.NODE_ENV || 'development',
    },
    sampling: {
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    },
  },
  sentry: {
    enabled: !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    debug: process.env.NODE_ENV === 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    correlationIdHeader:
      process.env.CORRELATION_ID_HEADER || 'x-correlation-id',
  },
}));
