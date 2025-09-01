import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from '../src/shared/cache/cache.service';
import Redis from 'ioredis';

describe('Cache Service (e2e)', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let redis: Redis;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REDIS_URL: 'redis://localhost:6379',
            }),
          ],
        }),
      ],
      providers: [CacheService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheService = app.get<CacheService>(CacheService);
    redis = new Redis('redis://localhost:6379');

    // Clear test data
    await redis.flushdb();
  }, 30000);

  afterAll(async () => {
    await redis.flushdb();
    await redis.disconnect();
    await cacheService.disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await redis.flushdb();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = { message: 'Hello Redis!' };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:delete';
      const value = { data: 'to be deleted' };

      await cacheService.set(key, value);
      let result = await cacheService.get(key);
      expect(result).toEqual(value);

      await cacheService.del(key);
      result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should handle TTL expiration', async () => {
      const key = 'test:ttl';
      const value = { expires: true };

      await cacheService.set(key, value, 1); // 1 second TTL
      let result = await cacheService.get(key);
      expect(result).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should delete keys by pattern', async () => {
      const keys = ['pattern:1', 'pattern:2', 'pattern:3', 'other:key'];
      const value = { test: true };

      // Set multiple keys
      for (const key of keys) {
        await cacheService.set(key, value);
      }

      // Verify all keys exist
      for (const key of keys) {
        const result = await cacheService.get(key);
        expect(result).toEqual(value);
      }

      // Delete pattern keys
      await cacheService.delPattern('pattern:*');

      // Verify pattern keys are deleted
      for (const key of ['pattern:1', 'pattern:2', 'pattern:3']) {
        const result = await cacheService.get(key);
        expect(result).toBeNull();
      }

      // Verify other key still exists
      const otherResult = await cacheService.get('other:key');
      expect(otherResult).toEqual(value);
    });
  });

  describe('User Permissions Cache', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-456';
    const permissions = ['read', 'write', 'admin'];

    it('should cache and retrieve user permissions', async () => {
      await cacheService.setUserPermissions(tenantId, userId, permissions);
      const result = await cacheService.getUserPermissions(tenantId, userId);

      expect(result).toEqual(permissions);
    });

    it('should invalidate user permissions', async () => {
      await cacheService.setUserPermissions(tenantId, userId, permissions);
      let result = await cacheService.getUserPermissions(tenantId, userId);
      expect(result).toEqual(permissions);

      await cacheService.invalidateUserPermissions(tenantId, userId);
      result = await cacheService.getUserPermissions(tenantId, userId);
      expect(result).toBeNull();
    });
  });

  describe('Workspace Cache', () => {
    const tenantId = 'tenant-123';
    const workspaceId = 'workspace-789';
    const workspace = {
      id: workspaceId,
      name: 'Test Workspace',
      description: 'A test workspace',
    };

    it('should cache and retrieve workspace data', async () => {
      await cacheService.setWorkspace(tenantId, workspaceId, workspace);
      const result = await cacheService.getWorkspace(tenantId, workspaceId);

      expect(result).toEqual(workspace);
    });

    it('should invalidate workspace cache', async () => {
      await cacheService.setWorkspace(tenantId, workspaceId, workspace);
      let result = await cacheService.getWorkspace(tenantId, workspaceId);
      expect(result).toEqual(workspace);

      await cacheService.invalidateWorkspace(tenantId, workspaceId);
      result = await cacheService.getWorkspace(tenantId, workspaceId);
      expect(result).toBeNull();
    });
  });

  describe('Project Cache', () => {
    const tenantId = 'tenant-123';
    const projectId = 'project-456';
    const project = {
      id: projectId,
      name: 'Test Project',
      status: 'active',
    };

    it('should cache and retrieve project data', async () => {
      await cacheService.setProject(tenantId, projectId, project);
      const result = await cacheService.getProject(tenantId, projectId);

      expect(result).toEqual(project);
    });

    it('should invalidate project cache', async () => {
      await cacheService.setProject(tenantId, projectId, project);
      let result = await cacheService.getProject(tenantId, projectId);
      expect(result).toEqual(project);

      await cacheService.invalidateProject(tenantId, projectId);
      result = await cacheService.getProject(tenantId, projectId);
      expect(result).toBeNull();
    });
  });

  describe('Task Counts Cache', () => {
    const tenantId = 'tenant-123';
    const projectId = 'project-456';
    const taskCounts = {
      total: 10,
      completed: 3,
      in_progress: 4,
      pending: 3,
    };

    it('should cache and retrieve task counts', async () => {
      await cacheService.setTaskCounts(tenantId, projectId, taskCounts);
      const result = await cacheService.getTaskCounts(tenantId, projectId);

      expect(result).toEqual(taskCounts);
    });

    it('should invalidate task counts cache', async () => {
      await cacheService.setTaskCounts(tenantId, projectId, taskCounts);
      let result = await cacheService.getTaskCounts(tenantId, projectId);
      expect(result).toEqual(taskCounts);

      await cacheService.invalidateTaskCounts(tenantId, projectId);
      result = await cacheService.getTaskCounts(tenantId, projectId);
      expect(result).toBeNull();
    });
  });

  describe('Tenant-wide Cache Invalidation', () => {
    const tenantId = 'tenant-123';

    it('should invalidate all cache entries for a tenant', async () => {
      // Set multiple cache entries for the tenant
      await cacheService.setUserPermissions(tenantId, 'user-1', ['read']);
      await cacheService.setWorkspace(tenantId, 'workspace-1', { name: 'WS1' });
      await cacheService.setProject(tenantId, 'project-1', { name: 'P1' });
      await cacheService.setTaskCounts(tenantId, 'project-1', { total: 5 });

      // Set cache for different tenant (should not be affected)
      const otherTenantId = 'tenant-456';
      await cacheService.setUserPermissions(otherTenantId, 'user-1', ['admin']);

      // Verify all entries exist
      expect(await cacheService.getUserPermissions(tenantId, 'user-1')).toEqual(['read']);
      expect(await cacheService.getWorkspace(tenantId, 'workspace-1')).toEqual({ name: 'WS1' });
      expect(await cacheService.getProject(tenantId, 'project-1')).toEqual({ name: 'P1' });
      expect(await cacheService.getTaskCounts(tenantId, 'project-1')).toEqual({ total: 5 });
      expect(await cacheService.getUserPermissions(otherTenantId, 'user-1')).toEqual(['admin']);

      // Invalidate all cache for the tenant
      await cacheService.invalidateTenant(tenantId);

      // Verify tenant cache is cleared
      expect(await cacheService.getUserPermissions(tenantId, 'user-1')).toBeNull();
      expect(await cacheService.getWorkspace(tenantId, 'workspace-1')).toBeNull();
      expect(await cacheService.getProject(tenantId, 'project-1')).toBeNull();
      expect(await cacheService.getTaskCounts(tenantId, 'project-1')).toBeNull();

      // Verify other tenant cache is unaffected
      expect(await cacheService.getUserPermissions(otherTenantId, 'user-1')).toEqual(['admin']);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const key = 'test:invalid:json';
      
      // Manually set invalid JSON in Redis
      await redis.set(key, 'invalid-json-string');
      
      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should handle Redis connection errors gracefully', async () => {
      // Create a cache service with invalid Redis URL
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                REDIS_URL: 'redis://invalid-host:6379',
              }),
            ],
          }),
        ],
        providers: [CacheService],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      const invalidCacheService = testApp.get<CacheService>(CacheService);

      // These operations should not throw errors
      await expect(invalidCacheService.set('test', 'value')).resolves.not.toThrow();
      await expect(invalidCacheService.get('test')).resolves.toBeNull();
      await expect(invalidCacheService.del('test')).resolves.not.toThrow();

      await invalidCacheService.disconnect();
      await testApp.close();
    });
  });
});
