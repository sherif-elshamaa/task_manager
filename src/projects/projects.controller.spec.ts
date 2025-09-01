import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  const mockProjectsService = {
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
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
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

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call projectsService.create with correct parameters', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'Test Project',
        description: 'Test Description',
        workspaceId: 'workspace_123',
      };
      const expectedProject = {
        project_id: 'project_123',
        ...createProjectDto,
      };

      mockProjectsService.create.mockResolvedValue(expectedProject);

      const result = await controller.create(
        createProjectDto,
        mockTenantContext,
      );

      expect(projectsService.create).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        dto: createProjectDto,
      });
      expect(result).toEqual(expectedProject);
    });
  });

  describe('findAll', () => {
    it('should call projectsService.findAll with correct parameters', async () => {
      const page = 1;
      const limit = 10;
      const search = 'test';
      const status = 'active';
      const expectedResult = {
        items: [{ project_id: 'project_123', name: 'Test Project' }],
        total: 1,
        page,
        limit,
      };

      mockProjectsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        mockTenantContext,
        page,
        limit,
        search,
        status,
      );

      expect(projectsService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        query: { page, limit, search, status },
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

      mockProjectsService.findAll.mockResolvedValue(expectedResult);

      await controller.findAll(mockTenantContext);

      expect(projectsService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        query: { page: 1, limit: 10, search: undefined, status: undefined },
      });
    });
  });

  describe('findOne', () => {
    it('should call projectsService.findOne with correct parameters', async () => {
      const projectId = 'project_123';
      const expectedProject = { project_id: projectId, name: 'Test Project' };

      mockProjectsService.findOne.mockResolvedValue(expectedProject);

      const result = await controller.findOne(projectId, mockTenantContext);

      expect(projectsService.findOne).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        id: projectId,
      });
      expect(result).toEqual(expectedProject);
    });
  });

  describe('update', () => {
    it('should call projectsService.update with correct parameters', async () => {
      const projectId = 'project_123';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };
      const expectedProject = { project_id: projectId, ...updateProjectDto };

      mockProjectsService.update.mockResolvedValue(expectedProject);

      const result = await controller.update(
        projectId,
        updateProjectDto,
        mockTenantContext,
      );

      expect(projectsService.update).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        id: projectId,
        dto: updateProjectDto,
      });
      expect(result).toEqual(expectedProject);
    });
  });

  describe('remove', () => {
    it('should call projectsService.remove with correct parameters', async () => {
      const projectId = 'project_123';

      mockProjectsService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(projectId, mockTenantContext);

      expect(projectsService.remove).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        id: projectId,
      });
      expect(result).toEqual({ deleted: true });
    });
  });
});
