import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let workspacesService: WorkspacesService;

  const mockWorkspacesService = {
    create: jest.fn(),
    list: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
    findAll: jest.fn(),
  };

  const mockTenantContext: TenantContext = {
    tenantId: 'tenant_123',
    userId: 'user_123',
    roles: ['admin'],
  };

  const mockTenantContextService = {
    getTenantContext: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        {
          provide: WorkspacesService,
          useValue: mockWorkspacesService,
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

    controller = module.get<WorkspacesController>(WorkspacesController);
    workspacesService = module.get<WorkspacesService>(WorkspacesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call workspacesService.create with correct parameters', async () => {
      const createWorkspaceDto: CreateWorkspaceDto = {
        name: 'Test Workspace',
        description: 'Test Description',
      };
      const expectedWorkspace = {
        workspace_id: 'workspace_123',
        ...createWorkspaceDto,
      };

      mockWorkspacesService.create.mockResolvedValue(expectedWorkspace);

      const result = await controller.create(
        createWorkspaceDto,
        mockTenantContext,
      );

      expect(workspacesService.create).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        dto: createWorkspaceDto,
      });
      expect(result).toEqual(expectedWorkspace);
    });
  });

  describe('findAll', () => {
    it('should call workspacesService.findAll with correct parameters', async () => {
      const page = 1;
      const limit = 10;
      const search = 'test';
      const expectedResult = {
        items: [{ workspace_id: 'workspace_123', name: 'Test Workspace' }],
        total: 1,
        page,
        limit,
      };

      mockWorkspacesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        mockTenantContext,
        page,
        limit,
        search,
      );

      expect(workspacesService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        query: { page, limit, search },
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

      mockWorkspacesService.findAll.mockResolvedValue(expectedResult);

      await controller.findAll(mockTenantContext);

      expect(workspacesService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        query: { page: 1, limit: 10, search: undefined },
      });
    });
  });

  describe('findOne', () => {
    it('should call workspacesService.findOne with correct parameters', async () => {
      const workspaceId = 'workspace_123';
      const expectedWorkspace = {
        workspace_id: workspaceId,
        name: 'Test Workspace',
      };

      mockWorkspacesService.findOne.mockResolvedValue(expectedWorkspace);

      const result = await controller.findOne(workspaceId, mockTenantContext);

      expect(workspacesService.findOne).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        id: workspaceId,
      });
      expect(result).toEqual(expectedWorkspace);
    });
  });

  describe('update', () => {
    it('should call workspacesService.update with correct parameters', async () => {
      const workspaceId = 'workspace_123';
      const updateWorkspaceDto: UpdateWorkspaceDto = {
        name: 'Updated Workspace',
        description: 'Updated Description',
      };
      const expectedWorkspace = {
        workspace_id: workspaceId,
        ...updateWorkspaceDto,
      };

      mockWorkspacesService.update.mockResolvedValue(expectedWorkspace);

      const result = await controller.update(
        workspaceId,
        updateWorkspaceDto,
        mockTenantContext,
      );

      expect(workspacesService.update).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        id: workspaceId,
        dto: updateWorkspaceDto,
      });
      expect(result).toEqual(expectedWorkspace);
    });
  });

  describe('remove', () => {
    it('should call workspacesService.remove with correct parameters', async () => {
      const workspaceId = 'workspace_123';

      mockWorkspacesService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(workspaceId, mockTenantContext);

      expect(workspacesService.remove).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        id: workspaceId,
      });
      expect(result).toEqual({ deleted: true });
    });
  });
});
