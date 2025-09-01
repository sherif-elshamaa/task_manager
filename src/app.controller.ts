import {
  Controller,
  Get,
  HttpStatus,
  Res,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './shared/roles/roles.guard';
import { Roles } from './shared/roles.decorator';
import { Public } from './shared/public.decorator';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly configService?: ConfigService,
    // @Optional() @InjectQueue('email') private readonly emailQueue?: Queue,
    // @Optional()
    // @InjectQueue('notifications')
    // private readonly notificationQueue?: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application status' })
  @ApiOkResponse({
    description: 'Application is running',
    schema: { type: 'string', example: 'Hello World!' },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Basic health check' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        environment: { type: 'string' },
        version: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string' },
            redis: { type: 'string' },
            s3: { type: 'string' },
          },
          required: ['database', 'redis', 's3'],
        },
      },
      required: [
        'status',
        'timestamp',
        'uptime',
        'environment',
        'version',
        'services',
      ],
    },
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck(@Res() res: Response) {
    try {
      // Check database connection
      let dbStatus = 'disconnected';
      if (this.configService?.get('DISABLE_DB') !== 'true' && this.dataSource) {
        try {
          await this.dataSource.query('SELECT 1');
          dbStatus = 'connected';
        } catch (_error) {
          dbStatus = 'error';
        }
      }

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: String(this.configService?.get('NODE_ENV') ?? 'unknown'),
        version: '1.0.0',
        services: {
          database: dbStatus,
          redis: this.configService?.get('REDIS_URL')
            ? 'configured'
            : 'not_configured',
          s3: this.configService?.get('AWS_ACCESS_KEY_ID')
            ? 'configured'
            : 'not_configured',
        },
      };

      const isHealthy =
        dbStatus === 'connected' ||
        this.configService?.get('DISABLE_DB') === 'true';
      const statusCode = isHealthy
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(health);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: message,
      });
    }
  }

  @Public()
  @Get('health/detailed')
  @ApiOperation({ summary: 'Detailed health check with all dependencies' })
  @ApiOkResponse({
    description: 'Detailed health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        environment: { type: 'string' },
        version: { type: 'string' },
        checks: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              responseTime: { type: 'number' },
              error: { type: 'string' },
            },
            required: ['status', 'responseTime'],
          },
        },
        system: {
          type: 'object',
          properties: {
            nodeVersion: { type: 'string' },
            platform: { type: 'string' },
            memory: { type: 'object' },
            cpu: { type: 'object' },
          },
          required: ['nodeVersion', 'platform', 'memory', 'cpu'],
        },
      },
      required: [
        'status',
        'timestamp',
        'uptime',
        'environment',
        'version',
        'checks',
        'system',
      ],
    },
  })
  async detailedHealthCheck(@Res() res: Response) {
    try {
      const checks: Record<
        string,
        { status: string; responseTime: number; error?: string }
      > = {
        database: { status: 'unknown', responseTime: 0 },
        redis: { status: 'unknown', responseTime: 0 },
        s3: { status: 'unknown', responseTime: 0 },
      };

      // Database check
      if (this.configService?.get('DISABLE_DB') !== 'true' && this.dataSource) {
        const dbStart = Date.now();
        try {
          await this.dataSource.query('SELECT 1');
          checks.database = {
            status: 'healthy',
            responseTime: Date.now() - dbStart,
          };
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          checks.database = {
            status: 'unhealthy',
            responseTime: Date.now() - dbStart,
            error: message,
          };
        }
      } else {
        checks.database = { status: 'disabled', responseTime: 0 };
      }

      // Redis check (basic - would need Redis client injection for full check)
      if (this.configService && this.configService.get('REDIS_URL')) {
        checks.redis = { status: 'configured', responseTime: 0 };
      } else {
        checks.redis = { status: 'not_configured', responseTime: 0 };
      }

      // S3 check (basic - would need S3 client injection for full check)
      if (this.configService && this.configService.get('AWS_ACCESS_KEY_ID')) {
        checks.s3 = { status: 'configured', responseTime: 0 };
      } else {
        checks.s3 = { status: 'not_configured', responseTime: 0 };
      }

      const overallStatus = Object.values(checks).every(
        (check) =>
          check.status === 'healthy' ||
          check.status === 'configured' ||
          check.status === 'disabled',
      )
        ? 'healthy'
        : 'degraded';

      const detailedHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: String(this.configService?.get('NODE_ENV') ?? 'unknown'),
        version: '1.0.0',
        checks,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
      };

      const statusCode =
        overallStatus === 'healthy'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(detailedHealth);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: message,
      });
    }
  }

  @Get('admin/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin health check with system metrics' })
  @ApiOkResponse({
    description: 'Admin health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        system: {
          type: 'object',
          properties: {
            memory: { type: 'object' },
            cpu: { type: 'object' },
            uptime: { type: 'number' },
            nodeVersion: { type: 'string' },
            platform: { type: 'string' },
            pid: { type: 'number' },
            title: { type: 'string' },
          },
          required: [
            'memory',
            'cpu',
            'uptime',
            'nodeVersion',
            'platform',
            'pid',
            'title',
          ],
        },
        environment: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['status', 'timestamp', 'system', 'environment', 'version'],
    },
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  adminHealthCheck(@Res() res: Response) {
    try {
      const systemMetrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        title: process.title,
      };

      const adminHealth = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        environment: String(this.configService?.get('NODE_ENV') ?? 'unknown'),
        version: '1.0.0',
      };

      res.status(HttpStatus.OK).json(adminHealth);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: message,
      });
    }
  }

  @Get('info')
  @ApiOperation({ summary: 'Get application information' })
  @ApiOkResponse({
    description: 'Application information',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        environment: { type: 'string' },
        features: { type: 'array', items: { type: 'string' } },
        documentation: { type: 'string' },
        health: { type: 'string' },
      },
      required: [
        'name',
        'version',
        'description',
        'environment',
        'features',
        'documentation',
        'health',
      ],
    },
  })
  getInfo() {
    return {
      name: 'Task Manager API',
      version: '1.0.0',
      description: 'Multi-tenant task management API',
      environment: String(this.configService?.get('NODE_ENV') ?? 'unknown'),
      features: [
        'Multi-tenancy with tenant isolation',
        'Role-based access control (RBAC)',
        'Project and task management',
        'File uploads with S3 integration',
        'Background job processing',
        'Activity logging and audit trails',
        'User invitation system',
        'RESTful API with OpenAPI documentation',
      ],
      documentation: '/v1/docs',
      health: '/v1/health',
    };
  }
}
