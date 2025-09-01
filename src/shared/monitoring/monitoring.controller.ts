import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PrometheusService } from './prometheus.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics in text format',
  })
  getMetrics(@Res() res: Response) {
    try {
      const metrics = this.prometheusService.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.status(HttpStatus.OK).send(metrics);
    } catch {
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Error collecting metrics');
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        memory: { type: 'object' },
        version: { type: 'string' },
      },
      required: ['status', 'timestamp', 'uptime', 'version'],
    },
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  getHealth(@Res() res: Response) {
    // Basic health check - in production, you'd check database, Redis, etc.
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || 'unknown',
    };

    res.status(HttpStatus.OK).json(health);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiOkResponse({
    description: 'Service is ready to receive traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        timestamp: { type: 'string', format: 'date-time' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            redis: { type: 'string', example: 'connected' },
          },
          required: ['database', 'redis'],
        },
      },
      required: ['status', 'timestamp', 'checks'],
    },
  })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async getReady(@Res() res: Response) {
    const checks: { database: string; redis: string } = {
      database: 'unknown',
      redis: 'unknown',
    };
    let dbOk = false;
    let redisOk = false;

    // Database check
    try {
      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.query('SELECT 1');
      await runner.release();
      checks.database = 'connected';
      dbOk = true;
    } catch {
      checks.database = 'unavailable';
    }

    // Redis check
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        await redis.connect();
        const pong = await redis.ping();
        await redis.quit();
        checks.redis = pong === 'PONG' ? 'connected' : 'unavailable';
        redisOk = pong === 'PONG';
      } catch {
        checks.redis = 'unavailable';
      }
    } else {
      checks.redis = 'not_configured';
      redisOk = true; // do not block readiness when Redis is optional and not configured
    }

    const statusOk = dbOk && redisOk;
    const payload = {
      status: statusOk ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };

    res
      .status(statusOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(payload);
  }
}
