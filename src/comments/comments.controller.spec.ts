import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
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

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call commentsService.create with correct parameters', async () => {
      const taskId = 'task_123';
      const createCommentDto: CreateCommentDto = {
        text: 'This is a test comment',
      };
      const expectedComment = {
        comment_id: 'comment_123',
        task_id: taskId,
        text: createCommentDto.text,
        created_by: mockTenantContext.userId,
      };

      mockCommentsService.create.mockResolvedValue(expectedComment);

      const result = await controller.create(
        taskId,
        createCommentDto,
        mockTenantContext,
      );

      expect(commentsService.create).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        taskId,
        dto: createCommentDto,
      });
      expect(result).toEqual(expectedComment);
    });
  });

  describe('findAll', () => {
    it('should call commentsService.list with correct parameters', async () => {
      const taskId = 'task_123';
      const expectedComments = {
        items: [
          {
            comment_id: 'comment_123',
            task_id: taskId,
            text: 'Test comment 1',
            created_by: 'user_123',
          },
          {
            comment_id: 'comment_456',
            task_id: taskId,
            text: 'Test comment 2',
            created_by: 'user_456',
          },
        ],
        total: 2,
      };

      mockCommentsService.list.mockResolvedValue(expectedComments);

      const result = await controller.findAll(taskId, mockTenantContext);

      expect(commentsService.list).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        taskId,
      });
      expect(result).toEqual(expectedComments);
    });
  });

  describe('update', () => {
    it('should call commentsService.update with correct parameters', async () => {
      const taskId = 'task_123';
      const commentId = 'comment_123';
      const updateCommentDto: UpdateCommentDto = {
        text: 'Updated comment text',
      };
      const expectedComment = {
        comment_id: commentId,
        task_id: taskId,
        text: updateCommentDto.text,
        created_by: mockTenantContext.userId,
      };

      mockCommentsService.update.mockResolvedValue(expectedComment);

      const result = await controller.update(
        taskId,
        commentId,
        updateCommentDto,
        mockTenantContext,
      );

      expect(commentsService.update).toHaveBeenCalledWith({
        commentId,
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        taskId,
        dto: updateCommentDto,
      });
      expect(result).toEqual(expectedComment);
    });
  });

  describe('remove', () => {
    it('should call commentsService.remove with correct parameters', async () => {
      const taskId = 'task_123';
      const commentId = 'comment_123';

      mockCommentsService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(
        taskId,
        commentId,
        mockTenantContext,
      );

      expect(commentsService.remove).toHaveBeenCalledWith({
        commentId,
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        taskId,
      });
      expect(result).toEqual({ success: true });
    });
  });
});
