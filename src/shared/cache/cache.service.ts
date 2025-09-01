import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTtl = 300; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTtl;
      await this.redis.setex(key, expiry, serialized);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  // Cache user permissions for faster auth checks
  async getUserPermissions(
    tenantId: string,
    userId: string,
  ): Promise<string[] | null> {
    const key = `permissions:${tenantId}:${userId}`;
    return this.get<string[]>(key);
  }

  async setUserPermissions(
    tenantId: string,
    userId: string,
    permissions: string[],
  ): Promise<void> {
    const key = `permissions:${tenantId}:${userId}`;
    await this.set(key, permissions, 600); // 10 minutes
  }

  async invalidateUserPermissions(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const key = `permissions:${tenantId}:${userId}`;
    await this.del(key);
  }

  // Cache workspace data
  async getWorkspace(
    tenantId: string,
    workspaceId: string,
  ): Promise<any | null> {
    const key = `workspace:${tenantId}:${workspaceId}`;
    return this.get(key);
  }

  async setWorkspace(
    tenantId: string,
    workspaceId: string,
    workspace: any,
  ): Promise<void> {
    const key = `workspace:${tenantId}:${workspaceId}`;
    await this.set(key, workspace, 300); // 5 minutes
  }

  async invalidateWorkspace(
    tenantId: string,
    workspaceId: string,
  ): Promise<void> {
    const key = `workspace:${tenantId}:${workspaceId}`;
    await this.del(key);
  }

  // Cache project data
  async getProject(tenantId: string, projectId: string): Promise<any | null> {
    const key = `project:${tenantId}:${projectId}`;
    return this.get(key);
  }

  async setProject(
    tenantId: string,
    projectId: string,
    project: any,
  ): Promise<void> {
    const key = `project:${tenantId}:${projectId}`;
    await this.set(key, project, 300); // 5 minutes
  }

  async invalidateProject(tenantId: string, projectId: string): Promise<void> {
    const key = `project:${tenantId}:${projectId}`;
    await this.del(key);
  }

  // Cache task counts for dashboard
  async getTaskCounts(
    tenantId: string,
    projectId: string,
  ): Promise<any | null> {
    const key = `task_counts:${tenantId}:${projectId}`;
    return this.get(key);
  }

  async setTaskCounts(
    tenantId: string,
    projectId: string,
    counts: any,
  ): Promise<void> {
    const key = `task_counts:${tenantId}:${projectId}`;
    await this.set(key, counts, 120); // 2 minutes
  }

  async invalidateTaskCounts(
    tenantId: string,
    projectId: string,
  ): Promise<void> {
    const key = `task_counts:${tenantId}:${projectId}`;
    await this.del(key);
  }

  // Invalidate all cache for a tenant
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.delPattern(`*:${tenantId}:*`);
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}
