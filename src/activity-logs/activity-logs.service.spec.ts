import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from '../entities/activity_log.entity';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let activityLogsRepository: Repository<ActivityLog>;

  const mockActivityLogsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        {
          provide: getRepositoryToken(ActivityLog),
          useValue: mockActivityLogsRepository,
        },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
    activityLogsRepository = module.get<Repository<ActivityLog>>(
      getRepositoryToken(ActivityLog),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create activity log', async () => {
      const input = {
        tenantId: 'tenant_123',
        actorId: 'user_123',
        resourceType: 'task',
        resourceId: 'task_123',
        action: 'create',
        data: { title: 'New Task' },
      };

      const activityLog = {
        log_id: 'log_123',
        tenant_id: input.tenantId,
        actor_id: input.actorId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        action: input.action,
        data: input.data,
      };

      mockActivityLogsRepository.create.mockReturnValue(activityLog);
      mockActivityLogsRepository.save.mockResolvedValue(activityLog);

      const result = await service.create(input);

      expect(result).toEqual(activityLog);
      expect(activityLogsRepository.create).toHaveBeenCalledWith({
        tenant_id: input.tenantId,
        actor_id: input.actorId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        action: input.action,
        data: input.data,
      });
      expect(activityLogsRepository.save).toHaveBeenCalledWith(activityLog);
    });
  });

  describe('findByTenant', () => {
    it('should return paginated activity logs', async () => {
      const input = {
        tenantId: 'tenant_123',
        page: 1,
        limit: 10,
        resourceType: 'task',
        resourceId: 'task_123',
        action: 'update',
      };

      const logs = [
        {
          log_id: 'log_123',
          resource_type: 'task',
          resource_id: 'task_123',
          action: 'update',
        },
      ];
      const total = 1;

      mockActivityLogsRepository.findAndCount.mockResolvedValue([logs, total]);

      const result = await service.findAll(input);

      expect(result).toEqual({
        items: logs,
        total,
        page: input.page,
        limit: input.limit,
      });
      expect(activityLogsRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: input.tenantId,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          action: input.action,
        }),
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        order: { created_at: 'DESC' },
        relations: ['actor'],
      });
    });

    it('should handle optional filters', async () => {
      const input = {
        tenantId: 'tenant_123',
        page: 1,
        limit: 10,
      };

      const logs = [];
      const total = 0;

      mockActivityLogsRepository.findAndCount.mockResolvedValue([logs, total]);

      await service.findAll(input);

      expect(activityLogsRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: input.tenantId,
        }),
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
        relations: ['actor'],
      });
    });
  });

  describe('findByResource', () => {
    it('should return activity logs for specific resource', async () => {
      const input = {
        tenantId: 'tenant_123',
        resourceType: 'project',
        resourceId: 'project_123',
        page: 1,
        limit: 10,
      };

      const logs = [
        {
          log_id: 'log_123',
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          action: 'create',
        },
        {
          log_id: 'log_456',
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          action: 'update',
        },
      ];
      const total = 2;

      mockActivityLogsRepository.findAndCount.mockResolvedValue([logs, total]);

      const result = await service.findByResource(input);

      expect(result).toEqual({
        items: logs,
        total,
        page: input.page,
        limit: input.limit,
      });
      expect(activityLogsRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          tenant_id: input.tenantId,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        order: { created_at: 'DESC' },
        relations: ['actor'],
      });
    });
  });
});
