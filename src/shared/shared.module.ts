import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { MetricsLoggingInterceptor } from './logging/metrics-logging.interceptor';
import { DatabaseMonitoringInterceptor } from './monitoring/database-monitoring.interceptor';
import { QueueMonitoringInterceptor } from './monitoring/queue-monitoring.interceptor';
import { MonitoringModule } from './monitoring/monitoring.module';
import { TracingModule } from './tracing/tracing.module';
import { ErrorTrackingModule } from './error-tracking/error-tracking.module';
import { S3Service } from './services/s3.service';
import { AntivirusService } from './services/antivirus.service';
import { TenantContextModule } from './tenant-context/tenant-context.module';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';
import { WorkspaceMember } from '../entities/workspace_member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceMember]),
    MonitoringModule,
    TracingModule,
    ErrorTrackingModule,
    TenantContextModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DatabaseMonitoringInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: QueueMonitoringInterceptor,
    },
    LoggingInterceptor, // Keep for backward compatibility
    S3Service,
    AntivirusService,
    WorkspaceMemberGuard,
    WorkspaceRoleGuard,
  ],
  exports: [
    MonitoringModule,
    TracingModule,
    ErrorTrackingModule,
    S3Service,
    AntivirusService,
    TenantContextModule,
    WorkspaceMemberGuard,
    WorkspaceRoleGuard,
  ],
})
export class SharedModule {}
