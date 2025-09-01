import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockTasksService = {
    create: jest.fn(),
    list: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    addAttachment: jest.fn(),
    removeAttachment: jest.fn(),
    assignTask: jest.fn(),
    getTasksByUser: jest.fn(),
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
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
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

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call tasksService.create with correct parameters', async () => {
      const projectId = 'project_123';
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'todo',
        priority: 'medium',
        assignedTo: 'user_456',
      };
      const expectedTask = { task_id: 'task_123', ...createTaskDto };

      mockTasksService.create.mockResolvedValue(expectedTask);

      const result = await controller.create(
        projectId,
        createTaskDto,
        mockTenantContext,
      );

      expect(tasksService.create).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        projectId,
        dto: createTaskDto,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('findAll', () => {
    it('should call tasksService.list with correct parameters', async () => {
      const projectId = 'project_123';
      const page = 1;
      const limit = 10;
      const search = 'test';
      const status = 'todo';
      const priority = 'high';
      const assignedTo = 'user_456';
      const expectedResult = {
        items: [{ task_id: 'task_123', title: 'Test Task' }],
        total: 1,
        page,
        limit,
      };

      mockTasksService.list.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        mockTenantContext,
        page,
        limit,
        search,
        status,
        priority,
        projectId,
      );

      expect(tasksService.list).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        projectId,
        status,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should use default values for optional parameters', async () => {
      const projectId = 'project_123';
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockTasksService.list.mockResolvedValue(expectedResult);

      await controller.findAll(
        mockTenantContext,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        projectId,
      );

      expect(tasksService.list).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        projectId,
        status: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should call tasksService.findOne with correct parameters', async () => {
      const taskId = 'task_123';
      const expectedTask = { task_id: taskId, title: 'Test Task' };

      mockTasksService.findOne.mockResolvedValue(expectedTask);

      const result = await controller.findOne(taskId, mockTenantContext);

      expect(tasksService.findOne).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        id: taskId,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('update', () => {
    it('should call tasksService.update with correct parameters', async () => {
      const taskId = 'task_123';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        description: 'Updated Description',
        status: 'in_progress',
      };
      const expectedTask = { task_id: taskId, ...updateTaskDto };

      mockTasksService.update.mockResolvedValue(expectedTask);

      const result = await controller.update(
        taskId,
        updateTaskDto,
        mockTenantContext,
      );

      expect(tasksService.update).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        taskId,
        dto: updateTaskDto,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('remove', () => {
    it('should call tasksService.remove with correct parameters', async () => {
      const taskId = 'task_123';

      mockTasksService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(taskId, mockTenantContext);

      expect(tasksService.remove).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        id: taskId,
      });
      expect(result).toEqual({ deleted: true });
    });
  });

  // The following tests are for methods that do not exist in the controller and are commented out.
  /*
  describe('updateStatus', () => {
    it('should call tasksService.updateStatus with correct parameters', async () => {
      const projectId = 'project_123';
      const taskId = 'task_123';
      const statusDto = { status: 'done' };
      const expectedTask = { task_id: taskId, status: 'done' };

      mockTasksService.updateStatus.mockResolvedValue(expectedTask);

      const result = await controller.updateStatus(projectId, taskId, statusDto, mockTenantContext);

      expect(tasksService.updateStatus).toHaveBeenCalledWith({
        taskId,
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        projectId,
        status: statusDto.status,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('addAttachment', () => {
    it('should call tasksService.addAttachment with correct parameters', async () => {
      const projectId = 'project_123';
      const taskId = 'task_123';
      const attachmentDto = {
        url: 'https://example.com/file.pdf',
        filename: 'document.pdf',
        contentType: 'application/pdf',
        size: 1024,
      };
      const expectedTask = { task_id: taskId, attachments: [attachmentDto] };

      mockTasksService.addAttachment.mockResolvedValue(expectedTask);

      const result = await controller.addAttachment(projectId, taskId, attachmentDto, mockTenantContext);

      expect(tasksService.addAttachment).toHaveBeenCalledWith({
        taskId,
        tenantId: mockTenantContext.tenantId,
        projectId,
        attachment: attachmentDto,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('removeAttachment', () => {
    it('should call tasksService.removeAttachment with correct parameters', async () => {
      const projectId = 'project_123';
      const taskId = 'task_123';
      const attachmentIndex = 0;
      const expectedTask = { task_id: taskId, attachments: [] };

      mockTasksService.removeAttachment.mockResolvedValue(expectedTask);

      const result = await controller.removeAttachment(projectId, taskId, attachmentIndex, mockTenantContext);

      expect(tasksService.removeAttachment).toHaveBeenCalledWith({
        taskId,
        tenantId: mockTenantContext.tenantId,
        projectId,
        attachmentIndex,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('assignTask', () => {
    it('should call tasksService.assignTask with correct parameters', async () => {
      const projectId = 'project_123';
      const taskId = 'task_123';
      const assignDto = { assignedTo: 'user_456' };
      const expectedTask = { task_id: taskId, assigned_to: 'user_456' };

      mockTasksService.assignTask.mockResolvedValue(expectedTask);

      const result = await controller.assignTask(projectId, taskId, assignDto, mockTenantContext);

      expect(tasksService.assignTask).toHaveBeenCalledWith({
        taskId,
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        projectId,
        assignedTo: assignDto.assignedTo,
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('getMyTasks', () => {
    it('should call tasksService.getTasksByUser with correct parameters', async () => {
      const expectedTasks = [
        { task_id: 'task_123', title: 'My Task 1' },
        { task_id: 'task_456', title: 'My Task 2' },
      ];

      mockTasksService.getTasksByUser.mockResolvedValue(expectedTasks);

      const result = await controller.getMyTasks(mockTenantContext);

      expect(tasksService.getTasksByUser).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
      });
      expect(result).toEqual(expectedTasks);
    });
  });
  */
});
