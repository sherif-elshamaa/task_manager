import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { InvitesModule } from './invites/invites.module';
import { JobsModule } from './jobs/jobs.module';
import { DatabaseModule } from './database/database.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { MonitoringModule } from './shared/monitoring/monitoring.module';
import { FilesModule } from './files/files.module';
import { TenantContextMiddleware } from './shared/tenant-context/tenant-context.middleware';
import { RolesGuard } from './shared/roles/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { TenantGuard } from './shared/tenant/tenant.guard';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        DISABLE_DB: Joi.string().valid('true', 'false').default('false'),
        DB_SYNC: Joi.string().valid('true', 'false').default('false'),
        DATABASE_URL: Joi.alternatives().conditional('DISABLE_DB', {
          is: 'true',
          then: Joi.string().optional(),
          otherwise: Joi.string().required(),
        }),
        JWT_SECRET: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        S3_BUCKET_NAME: Joi.string().default('task-manager-uploads'),
        AWS_REGION: Joi.string().default('us-east-1'),
        AWS_ACCESS_KEY_ID: Joi.string().optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
        SENTRY_DSN: Joi.string().optional(),
        JAEGER_ENDPOINT: Joi.string().default(
          'http://localhost:14268/api/traces',
        ),
        RETENTION_DAYS: Joi.number().integer().min(1).default(90),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: process.env.NODE_ENV === 'test' ? 1000 : 120,
      },
    ]),
    ...(process.env.DISABLE_DB === 'true'
      ? []
      : [
          TypeOrmModule.forRootAsync({
            useFactory: () => ({
              type: 'postgres',
              url: process.env.DATABASE_URL,
              autoLoadEntities: true,
              synchronize: process.env.DB_SYNC === 'true',
              logging:
                process.env.NODE_ENV === 'development'
                  ? true
                  : ['error', 'warn'],
              migrationsRun: process.env.NODE_ENV === 'production',
              retryAttempts: process.env.NODE_ENV === 'production' ? 3 : 10,
              retryDelay: 3000,
              maxQueryExecutionTime: 30000, // 30 seconds
              ssl:
                process.env.NODE_ENV === 'production'
                  ? { rejectUnauthorized: false }
                  : false,
            }),
          }),
        ]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
    SharedModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    InvitesModule,
    JobsModule,
    DatabaseModule,
    ActivityLogsModule,
    MonitoringModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
