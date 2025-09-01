import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController;
  let activityLogsService: ActivityLogsService;

  const mockActivityLogsService = {
    findAll: jest.fn(),
    findByResource: jest.fn(),
    createLog: jest.fn(),
  };

  const mockTenantContextService = {
    getTenantContext: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
  };

  const mockTenantContext: TenantContext = {
    tenantId: 'tenant_123',
    userId: 'user_123',
    roles: ['admin'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogsController],
      providers: [
        {
          provide: ActivityLogsService,
          useValue: mockActivityLogsService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    controller = module.get<ActivityLogsController>(ActivityLogsController);
    activityLogsService = module.get<ActivityLogsService>(ActivityLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call activityLogsService.findAll with correct parameters', async () => {
      const page = 1;
      const limit = 10;
      const resourceType = 'task';
      const resourceId = 'task_123';
      const action = 'create';
      const expectedResult = {
        items: [
          {
            log_id: 'log_123',
            resource_type: 'task',
            resource_id: 'task_123',
            action: 'create',
            actor_id: 'user_123',
          },
        ],
        total: 1,
        page,
        limit,
      };

      mockActivityLogsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        mockTenantContext,
        page,
        limit,
        resourceType,
        resourceId,
        action,
      );

      expect(activityLogsService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        page,
        limit,
        resourceType,
        resourceId,
        action,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should use default values for optional parameters', async () => {
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockActivityLogsService.findAll.mockResolvedValue(expectedResult);

      await controller.findAll(mockTenantContext);

      expect(activityLogsService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        page: 1,
        limit: 10,
        resourceType: undefined,
        resourceId: undefined,
        action: undefined,
      });
    });
  });

  describe('findByResource', () => {
    it('should call activityLogsService.findByResource with correct parameters', async () => {
      const resourceType = 'task';
      const resourceId = 'task_123';
      const page = 1;
      const limit = 10;
      const expectedResult = {
        items: [
          {
            log_id: 'log_123',
            resource_type: resourceType,
            resource_id: resourceId,
            action: 'update',
            actor_id: 'user_123',
          },
        ],
        total: 1,
        page,
        limit,
      };

      mockActivityLogsService.findByResource.mockResolvedValue(expectedResult);

      const result = await controller.findByResource(
        resourceType,
        resourceId,
        mockTenantContext,
        page,
        limit,
      );

      expect(activityLogsService.findByResource).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        resourceType,
        resourceId,
        page,
        limit,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should use default values for optional parameters', async () => {
      const resourceType = 'project';
      const resourceId = 'project_123';
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockActivityLogsService.findByResource.mockResolvedValue(expectedResult);

      await controller.findByResource(
        resourceType,
        resourceId,
        mockTenantContext,
      );

      expect(activityLogsService.findByResource).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        resourceType,
        resourceId,
        page: 1,
        limit: 10,
      });
    });
  });
});
