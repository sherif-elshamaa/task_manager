import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantsRepository: Repository<Tenant>;
  let usersRepository: Repository<User>;
  let projectsRepository: Repository<Project>;
  let tasksRepository: Repository<Task>;

  const mockTenantsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersRepository = {
    count: jest.fn(),
  };

  const mockProjectsRepository = {
    count: jest.fn(),
  };

  const mockTasksRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    tenantsRepository = module.get<Repository<Tenant>>(
      getRepositoryToken(Tenant),
    );
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    projectsRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    tasksRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      const createTenantDto = {
        name: 'Test Company',
        plan: 'free',
      };

      const tenant = {
        tenant_id: 'tenant_123',
        ...createTenantDto,
        status: 'active',
      };

      mockTenantsRepository.create.mockReturnValue(tenant);
      mockTenantsRepository.save.mockResolvedValue(tenant);

      const result = await service.create(createTenantDto);

      expect(result).toEqual(tenant);
      expect(tenantsRepository.create).toHaveBeenCalledWith({
        name: createTenantDto.name,
        plan: createTenantDto.plan || 'free',
        status: 'active',
      });
      expect(tenantsRepository.save).toHaveBeenCalledWith(tenant);
    });
  });

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      const input = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      const tenants = [{ tenant_id: 'tenant_123', name: 'Test Company' }];
      const total = 1;

      mockTenantsRepository.findAndCount.mockResolvedValue([tenants, total]);

      const result = await service.findAll(input);

      expect(result).toEqual({
        items: tenants,
        total,
        page: input.page,
        limit: input.limit,
      });
      expect(tenantsRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({}),
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        order: { created_at: 'DESC' },
      });
    });

    it('should handle search filter', async () => {
      const input = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockTenantsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll(input);

      expect(tenantsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'tenant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tenant.name ILIKE :search',
        {
          search: `%${input.search}%`,
        },
      );
    });
  });

  describe('findOne', () => {
    it('should return tenant when found', async () => {
      const tenantId = 'tenant_123';
      const tenant = {
        tenant_id: tenantId,
        name: 'Test Company',
        plan: 'free',
      };

      mockTenantsRepository.findOne.mockResolvedValue(tenant);

      const result = await service.findOne(tenantId);

      expect(result).toEqual(tenant);
      expect(tenantsRepository.findOne).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
      });
    });

    it('should return null when tenant not found', async () => {
      const tenantId = 'nonexistent';

      mockTenantsRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(tenantId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update tenant', async () => {
      const input = {
        tenantId: 'tenant_123',
        dto: {
          name: 'Updated Company',
        },
      };

      const updatedTenant = {
        tenant_id: input.tenantId,
        ...input.dto,
      };

      mockTenantsRepository.update.mockResolvedValue({ affected: 1 });
      mockTenantsRepository.findOne.mockResolvedValue(updatedTenant);

      const result = await service.update(input);

      expect(result).toEqual(updatedTenant);
      expect(tenantsRepository.update).toHaveBeenCalledWith(
        { tenant_id: input.tenantId },
        input.dto,
      );
      expect(tenantsRepository.findOne).toHaveBeenCalledWith({
        where: { tenant_id: input.tenantId },
      });
    });
  });

  describe('getUsage', () => {
    it('should return tenant usage statistics', async () => {
      const tenantId = 'tenant_123';
      const userCount = 5;
      const projectCount = 3;
      const taskCount = 25;

      mockUsersRepository.count.mockResolvedValue(userCount);
      mockProjectsRepository.count.mockResolvedValue(projectCount);
      mockTasksRepository.count.mockResolvedValue(taskCount);

      const result = await service.getUsage(tenantId);

      expect(result).toEqual({
        users: userCount,
        projects: projectCount,
        tasks: taskCount,
        storage_used: 0,
        limits: {
          max_users: 100,
          max_projects: 50,
          max_tasks: 1000,
          max_storage: 5000000000,
        },
      });
      expect(usersRepository.count).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
      });
      expect(projectsRepository.count).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
      });
      expect(tasksRepository.count).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
      });
    });
  });

  describe('updatePlan', () => {
    it('should update tenant plan', async () => {
      const input = {
        tenantId: 'tenant_123',
        plan: 'premium',
      };

      const updatedTenant = {
        tenant_id: input.tenantId,
        plan: input.plan,
      };

      mockTenantsRepository.update.mockResolvedValue({ affected: 1 });
      mockTenantsRepository.findOne.mockResolvedValue(updatedTenant);

      const result = await service.updatePlan(input);

      expect(result).toEqual(updatedTenant);
      expect(tenantsRepository.update).toHaveBeenCalledWith(
        { tenant_id: input.tenantId },
        { plan: input.plan },
      );
    });
  });
});
