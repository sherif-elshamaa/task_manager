import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspacesService } from './workspaces.service';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace_member.entity';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let workspacesRepository: Repository<Workspace>;
  let membersRepository: Repository<WorkspaceMember>;

  const mockWorkspacesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockMembersRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: getRepositoryToken(Workspace),
          useValue: mockWorkspacesRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: mockMembersRepository,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    workspacesRepository = module.get<Repository<Workspace>>(
      getRepositoryToken(Workspace),
    );
    membersRepository = module.get<Repository<WorkspaceMember>>(
      getRepositoryToken(WorkspaceMember),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create workspace and add creator as admin member', async () => {
      const input = {
        tenantId: 'tenant_123',
        userId: 'user_123',
        dto: {
          name: 'Test Workspace',
          description: 'Test Description',
        },
      };

      const workspace = {
        workspace_id: 'workspace_123',
        tenant_id: input.tenantId,
        name: input.dto.name,
        description: input.dto.description,
        created_by: input.userId,
      };

      const member = {
        workspace_id: workspace.workspace_id,
        user_id: input.userId,
        role: 'admin',
      };

      mockWorkspacesRepository.create.mockReturnValue(workspace);
      mockWorkspacesRepository.save.mockResolvedValue(workspace);
      mockMembersRepository.save.mockResolvedValue(member);

      const result = await service.create(input);

      expect(result).toEqual(workspace);
      expect(workspacesRepository.create).toHaveBeenCalledWith({
        tenant_id: input.tenantId,
        name: input.dto.name,
        description: input.dto.description,
        created_by: input.userId,
      });
      expect(workspacesRepository.save).toHaveBeenCalledWith(workspace);
      expect(membersRepository.save).toHaveBeenCalledWith({
        workspace_id: workspace.workspace_id,
        user_id: input.userId,
        role: 'admin',
      });
    });
  });

  describe('list', () => {
    it('should return paginated workspaces', async () => {
      const input = {
        tenantId: 'tenant_123',
        page: 1,
        limit: 10,
        search: 'test',
      };

      const workspaces = [
        { workspace_id: 'workspace_123', name: 'Test Workspace' },
      ];
      const total = 1;

      mockWorkspacesRepository.findAndCount.mockResolvedValue([
        workspaces,
        total,
      ]);

      const result = await service.list(input);

      expect(result).toEqual({
        items: workspaces,
        total,
        page: input.page,
        limit: input.limit,
      });
      expect(workspacesRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: input.tenantId,
        }),
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return workspace when found', async () => {
      const input = {
        workspaceId: 'workspace_123',
        tenantId: 'tenant_123',
      };

      const workspace = {
        workspace_id: input.workspaceId,
        tenant_id: input.tenantId,
        name: 'Test Workspace',
      };

      mockWorkspacesRepository.findOne.mockResolvedValue(workspace);

      const result = await service.findOne(input);

      expect(result).toEqual(workspace);
      expect(workspacesRepository.findOne).toHaveBeenCalledWith({
        where: {
          workspace_id: input.workspaceId,
          tenant_id: input.tenantId,
        },
      });
    });

    it('should return null when workspace not found', async () => {
      const input = {
        workspaceId: 'nonexistent',
        tenantId: 'tenant_123',
      };

      mockWorkspacesRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(input);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update workspace', async () => {
      const input = {
        workspaceId: 'workspace_123',
        tenantId: 'tenant_123',
        userId: 'user_123',
        dto: {
          name: 'Updated Workspace',
          description: 'Updated Description',
        },
      };

      const updatedWorkspace = {
        workspace_id: input.workspaceId,
        ...input.dto,
      };

      mockWorkspacesRepository.update.mockResolvedValue({ affected: 1 });
      mockWorkspacesRepository.findOne.mockResolvedValue(updatedWorkspace);

      const result = await service.update(input);

      expect(result).toEqual(updatedWorkspace);
      expect(workspacesRepository.update).toHaveBeenCalledWith(
        {
          workspace_id: input.workspaceId,
          tenant_id: input.tenantId,
        },
        input.dto,
      );
      expect(workspacesRepository.findOne).toHaveBeenCalledWith({
        where: {
          workspace_id: input.workspaceId,
          tenant_id: input.tenantId,
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete workspace', async () => {
      const input = {
        workspaceId: 'workspace_123',
        tenantId: 'tenant_123',
        userId: 'user_123',
      };

      mockWorkspacesRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(input);

      expect(workspacesRepository.delete).toHaveBeenCalledWith({
        workspace_id: input.workspaceId,
        tenant_id: input.tenantId,
      });
    });
  });

  describe('archive', () => {
    it('should archive workspace', async () => {
      const input = {
        workspaceId: 'workspace_123',
        tenantId: 'tenant_123',
        userId: 'user_123',
      };

      const archivedWorkspace = {
        workspace_id: input.workspaceId,
        is_archived: true,
      };

      mockWorkspacesRepository.update.mockResolvedValue({ affected: 1 });
      mockWorkspacesRepository.findOne.mockResolvedValue(archivedWorkspace);

      const result = await service.archive(input);

      expect(result).toEqual(archivedWorkspace);
      expect(workspacesRepository.update).toHaveBeenCalledWith(
        {
          workspace_id: input.workspaceId,
          tenant_id: input.tenantId,
        },
        { is_archived: true },
      );
    });
  });

  describe('unarchive', () => {
    it('should unarchive workspace', async () => {
      const input = {
        workspaceId: 'workspace_123',
        tenantId: 'tenant_123',
        userId: 'user_123',
      };

      const unarchivedWorkspace = {
        workspace_id: input.workspaceId,
        is_archived: false,
      };

      mockWorkspacesRepository.update.mockResolvedValue({ affected: 1 });
      mockWorkspacesRepository.findOne.mockResolvedValue(unarchivedWorkspace);

      const result = await service.unarchive(input);

      expect(result).toEqual(unarchivedWorkspace);
      expect(workspacesRepository.update).toHaveBeenCalledWith(
        {
          workspace_id: input.workspaceId,
          tenant_id: input.tenantId,
        },
        { is_archived: false },
      );
    });
  });
});
