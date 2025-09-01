# Monitoring & Observability

This document describes the comprehensive monitoring and observability setup for the Task Manager API.

## Overview

The monitoring stack includes:
- **Prometheus** - Metrics collection and storage
- **Grafana** - Metrics visualization and dashboards
- **Jaeger** - Distributed tracing
- **Sentry** - Error tracking and performance monitoring
- **Enhanced Logging** - Structured logging with correlation IDs

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Task Manager  │    │    Prometheus   │    │     Grafana     │
│      API        │───▶│   (Metrics)     │───▶│  (Dashboard)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Jaeger      │    │      Sentry     │    │   Structured    │
│   (Tracing)     │    │  (Error Track)  │    │    Logging      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Metrics

### HTTP Metrics
- Request count by method, path, status code, and tenant
- Request duration (histogram)
- Requests in progress (gauge)

### Database Metrics
- Query duration by operation, table, and tenant
- Active connections
- Connection attempts (success/failure)

### Business Metrics
- Tasks created by tenant, project, and priority
- Projects created by tenant and workspace
- Active users by tenant and role
- Active tenants count

### Queue Metrics
- Job processing duration
- Jobs processed (success/failure)
- Jobs in progress

### System Metrics
- CPU usage
- Memory usage
- Node.js specific metrics

## Tracing

### OpenTelemetry Integration
- Automatic instrumentation for HTTP, Express, TypeORM, and Redis
- Custom spans for business operations
- Correlation with Prometheus metrics and Sentry errors

### Jaeger Configuration
- HTTP collector endpoint: `http://localhost:14268/api/traces`
- Web UI: `http://localhost:16686`
- Sampling rates configurable by environment

## Error Tracking

### Sentry Integration
- Automatic error capture with context
- Performance monitoring
- User context and tenant isolation
- Correlation with trace IDs

## Logging

### Structured Logging
- JSON format for machine readability
- Correlation IDs for request tracing
- User and tenant context
- Performance metrics integration

### Log Levels
- `info` - Normal operations
- `warn` - Potential issues
- `error` - Errors with full context

## Setup

### 1. Environment Variables

```bash
# Monitoring Configuration
PROMETHEUS_ENABLED=true
TRACING_ENABLED=true
SENTRY_DSN=your_sentry_dsn
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
CORRELATION_ID_HEADER=x-correlation-id
```

### 2. Start Monitoring Stack

```bash
# Start the monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. Access Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger**: http://localhost:16686
- **API Metrics**: http://localhost:3000/v1/monitoring/metrics
- **Health Check**: http://localhost:3000/v1/monitoring/health

## Usage

### Adding Custom Metrics

```typescript
import { PrometheusService } from './shared/monitoring/prometheus.service';

constructor(private readonly prometheusService: PrometheusService) {}

// Record business metric
this.prometheusService.recordTaskCreated(tenantId, projectId, priority);
```

### Adding Custom Tracing

```typescript
import { TracingService } from './shared/tracing/tracing.service';

constructor(private readonly tracingService: TracingService) {}

// Trace async operation
await this.tracingService.traceAsync('Create Task', async (span) => {
  span.setAttributes({ 'task.priority': priority });
  return await this.taskService.create(taskData);
});
```

### Adding Custom Error Tracking

```typescript
import { SentryService } from './shared/error-tracking/sentry.service';

constructor(private readonly sentryService: SentryService) {}

// Capture error with context
this.sentryService.captureException(error, {
  tenantId,
  userId,
  operation: 'create_task',
});
```

## Dashboards

### Default Dashboard
The default Grafana dashboard includes:
- HTTP request rate and response time
- Database query performance
- Queue job processing metrics
- Business metrics (tasks, projects, users)
- System resource usage

### Custom Dashboards
Create custom dashboards for:
- Tenant-specific metrics
- Business KPIs
- Performance SLAs
- Error rate monitoring

## Alerts

### Prometheus Alerting Rules
Configure alerts for:
- High error rates (>5%)
- Slow response times (>2s 95th percentile)
- High database query times (>1s)
- Queue job failures
- System resource exhaustion

### Alert Channels
- Slack notifications
- Email alerts
- PagerDuty integration
- Webhook callbacks

## Best Practices

### 1. Metric Naming
- Use snake_case for metric names
- Include relevant labels (tenant_id, operation, etc.)
- Avoid high cardinality labels

### 2. Tracing
- Keep spans focused and meaningful
- Add business context to spans
- Use correlation IDs consistently

### 3. Error Tracking
- Include relevant context
- Avoid sensitive data
- Use appropriate error levels

### 4. Performance
- Sample traces in production (10%)
- Use histogram buckets appropriately
- Monitor metric cardinality

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check Prometheus targets
   - Verify endpoint accessibility
   - Check firewall rules

2. **Tracing not working**
   - Verify Jaeger is running
   - Check endpoint configuration
   - Verify instrumentation

3. **High cardinality**
   - Review label usage
   - Limit dynamic values
   - Use metric relabeling

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check metrics endpoint
curl http://localhost:3000/v1/monitoring/metrics

# Check Jaeger health
curl http://localhost:16686/api/services
```

## Maintenance

### Regular Tasks
- Monitor disk usage for Prometheus
- Review and update dashboards
- Clean up old traces
- Review alert thresholds
- Update monitoring stack versions

### Backup
- Export Grafana dashboards
- Backup Prometheus data
- Export alert rules
- Document custom configurations
