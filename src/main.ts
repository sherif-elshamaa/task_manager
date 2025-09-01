import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet, { HelmetOptions } from 'helmet';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SentryExceptionFilter } from './shared/filters/sentry-exception.filter';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);

  // Global Sentry exception filter
  const { httpAdapter } = app.get(HttpAdapterHost);
  if (config.get('NODE_ENV') !== 'test') {
    app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
  }

  // Global prefix
  app.setGlobalPrefix('v1');

  // Security middleware
  const helmetFn = helmet as unknown as (
    options?: HelmetOptions,
  ) => import('express').RequestHandler;
  app.use(
    helmetFn({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const compressionFactory =
    compression as unknown as () => import('express').RequestHandler;
  app.use(compressionFactory());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: false,
      disableErrorMessages: config.get('NODE_ENV') === 'production',
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: String(config.get('CORS_ORIGINS', '*')).split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Swagger documentation
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Task Manager API')
      .setDescription(
        'Multi-tenant task management API with comprehensive project and task management capabilities',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('users', 'User management')
      .addTag('workspaces', 'Workspace management')
      .addTag('projects', 'Project management')
      .addTag('tasks', 'Task management')
      .addTag('comments', 'Comment management')
      .addTag('invites', 'User invitation management')
      .addTag('monitoring', 'Monitoring and observability endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('v1/docs', app, document);

    app.get(Logger).log('Swagger documentation available at /v1/docs');
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${config.get('NODE_ENV')}`);
  logger.log(
    `Database: ${config.get('DATABASE_URL') ? 'Connected' : 'Not configured'}`,
  );
  logger.log(
    `Redis: ${config.get('REDIS_URL') ? 'Connected' : 'Not configured'}`,
  );
  logger.log(
    `Monitoring: ${config.get('SENTRY_DSN') ? 'Sentry enabled' : 'Sentry disabled'}`,
  );
  logger.log(
    `Tracing: ${config.get('JAEGER_ENDPOINT') ? 'Jaeger enabled' : 'Jaeger disabled'}`,
  );
  logger.log(
    `Prometheus metrics available at: http://localhost:${port}/v1/monitoring/metrics`,
  );
  logger.log(
    `Health check available at: http://localhost:${port}/v1/monitoring/health`,
  );

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

void bootstrap().catch(async (error: unknown) => {
  console.error('Fatal error during bootstrap', error);
  try {
    await Sentry.flush(2000);
  } catch (e: unknown) {
    // no-op
    void e;
  }
  process.exit(1);
});
