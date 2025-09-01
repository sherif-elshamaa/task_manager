/*
 eslint-disable @typescript-eslint/no-require-imports,
 @typescript-eslint/no-unsafe-assignment,
 @typescript-eslint/no-unsafe-call,
 @typescript-eslint/no-unsafe-member-access,
 @typescript-eslint/no-unsafe-return
*/
import { Injectable, OnModuleInit } from '@nestjs/common';
// prom-client may not be present in some environments; require dynamically and fall back to no-op

let promClient: any;
try {
  promClient = require('prom-client');
} catch {
  promClient = {
    Registry: class {
      metrics() {
        return '';
      }
    },
    Counter: class {
      constructor() {}
      inc() {}
    },
    Histogram: class {
      constructor() {}
      observe() {}
    },
    Gauge: class {
      constructor() {}
      set() {}
    },
    collectDefaultMetrics: () => {},
  };
}

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly registry: InstanceType<typeof promClient.Registry>;

  // HTTP metrics
  private readonly httpRequestsTotal: any;
  private readonly httpRequestDuration: any;
  private readonly httpRequestsInProgress: any;

  // Database metrics
  private readonly dbQueryDuration: any;
  private readonly dbConnectionsActive: any;
  private readonly dbConnectionsTotal: any;

  // Business metrics
  private readonly tasksCreatedTotal: any;
  private readonly projectsCreatedTotal: any;
  private readonly usersActiveTotal: any;
  private readonly tenantsActiveTotal: any;

  // Queue metrics
  private readonly queueJobDuration: any;
  private readonly queueJobsTotal: any;
  private readonly queueJobsInProgress: any;

  constructor() {
    this.registry = new promClient.Registry();

    // HTTP metrics
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code', 'tenant_id'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'tenant_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new promClient.Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method', 'path'],
      registers: [this.registry],
    });

    // Database metrics
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table', 'tenant_id'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new promClient.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    this.dbConnectionsTotal = new promClient.Counter({
      name: 'db_connections_total',
      help: 'Total number of database connections',
      labelNames: ['status'],
      registers: [this.registry],
    });

    // Business metrics
    this.tasksCreatedTotal = new promClient.Counter({
      name: 'tasks_created_total',
      help: 'Total number of tasks created',
      labelNames: ['tenant_id', 'project_id', 'priority'],
      registers: [this.registry],
    });

    this.projectsCreatedTotal = new promClient.Counter({
      name: 'projects_created_total',
      help: 'Total number of projects created',
      labelNames: ['tenant_id', 'workspace_id'],
      registers: [this.registry],
    });

    this.usersActiveTotal = new promClient.Gauge({
      name: 'users_active_total',
      help: 'Total number of active users',
      labelNames: ['tenant_id', 'role'],
      registers: [this.registry],
    });

    this.tenantsActiveTotal = new promClient.Gauge({
      name: 'tenants_active_total',
      help: 'Total number of active tenants',
      registers: [this.registry],
    });

    // Queue metrics
    this.queueJobDuration = new promClient.Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Queue job duration in seconds',
      labelNames: ['queue_name', 'job_type', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.queueJobsTotal = new promClient.Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name', 'job_type', 'status'],
      registers: [this.registry],
    });

    this.queueJobsInProgress = new promClient.Gauge({
      name: 'queue_jobs_in_progress',
      help: 'Number of queue jobs currently in progress',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Enable default metrics
    promClient.collectDefaultMetrics({ register: this.registry });
  }

  // HTTP metrics methods
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    tenantId?: string,
  ) {
    this.httpRequestsTotal.inc({
      method,
      path,
      status_code: statusCode.toString(),
      tenant_id: tenantId || 'unknown',
    });
  }

  recordHttpRequestDuration(
    method: string,
    path: string,
    duration: number,
    tenantId?: string,
  ) {
    this.httpRequestDuration.observe(
      { method, path, tenant_id: tenantId || 'unknown' },
      duration / 1000,
    );
  }

  setHttpRequestsInProgress(method: string, path: string, count: number) {
    this.httpRequestsInProgress.set({ method, path }, count);
  }

  // Database metrics methods
  recordDbQuery(
    operation: string,
    table: string,
    duration: number,
    tenantId?: string,
  ) {
    this.dbQueryDuration.observe(
      { operation, table, tenant_id: tenantId || 'unknown' },
      duration / 1000,
    );
  }

  setDbConnectionsActive(count: number) {
    this.dbConnectionsActive.set(count);
  }

  recordDbConnection(status: 'success' | 'failed') {
    this.dbConnectionsTotal.inc({ status });
  }

  // Business metrics methods
  recordTaskCreated(tenantId: string, projectId: string, priority: string) {
    this.tasksCreatedTotal.inc({
      tenant_id: tenantId,
      project_id: projectId,
      priority,
    });
  }

  recordProjectCreated(tenantId: string, workspaceId?: string) {
    this.projectsCreatedTotal.inc({
      tenant_id: tenantId,
      workspace_id: workspaceId || 'none',
    });
  }

  setUsersActive(tenantId: string, role: string, count: number) {
    this.usersActiveTotal.set({ tenant_id: tenantId, role }, count);
  }

  setTenantsActive(count: number) {
    this.tenantsActiveTotal.set(count);
  }

  // Queue metrics methods
  recordQueueJob(
    queueName: string,
    jobType: string,
    duration: number,
    status: 'success' | 'failed',
  ) {
    this.queueJobDuration.observe(
      { queue_name: queueName, job_type: jobType, status },
      duration / 1000,
    );
  }

  recordQueueJobProcessed(
    queueName: string,
    jobType: string,
    status: 'success' | 'failed',
  ) {
    this.queueJobsTotal.inc({
      queue_name: queueName,
      job_type: jobType,
      status,
    });
  }

  setQueueJobsInProgress(queueName: string, count: number) {
    this.queueJobsInProgress.set({ queue_name: queueName }, count);
  }

  // Get metrics for Prometheus endpoint
  getMetrics(): string {
    return this.registry.metrics();
  }

  // Get registry for custom metrics
  getRegistry(): InstanceType<typeof promClient.Registry> {
    return this.registry;
  }
}
