import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let tenantsRepository: Repository<Tenant>;

  const mockUsersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTenantsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantsRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tenantsRepository = module.get<Repository<Tenant>>(
      getRepositoryToken(Tenant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const tenantId = 'tenant_123';
      const email = 'test@example.com';
      const expectedUser = { user_id: 'user_123', email, tenant_id: tenantId };

      mockUsersRepository.findOne.mockResolvedValue(expectedUser);

      const result = await service.findByEmail(tenantId, email);

      expect(result).toEqual(expectedUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { tenant_id: tenantId, email },
      });
    });

    it('should return null when user not found', async () => {
      const tenantId = 'tenant_123';
      const email = 'notfound@example.com';

      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(tenantId, email);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const userId = 'user_123';
      const expectedUser = { user_id: userId, email: 'test@example.com' };

      mockUsersRepository.findOne.mockResolvedValue(expectedUser);

      const result = await service.findById(userId);

      expect(result).toEqual(expectedUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent';

      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(userId);

      expect(result).toBeNull();
    });
  });

  describe('createTenantWithOwner', () => {
    it('should create tenant and owner user', async () => {
      const input = {
        tenantName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const tenant = {
        tenant_id: 'tenant_123',
        name: input.tenantName,
        plan: 'free',
      };

      const hashedPassword = 'hashed_password';
      const owner = {
        user_id: 'user_123',
        tenant_id: tenant.tenant_id,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true,
      };

      mockTenantsRepository.create.mockReturnValue(tenant);
      mockTenantsRepository.save.mockResolvedValue(tenant);
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersRepository.create.mockReturnValue(owner);
      mockUsersRepository.save.mockResolvedValue(owner);

      const result = await service.createTenantWithOwner(input);

      expect(result).toEqual({ tenant, owner });
      expect(tenantsRepository.create).toHaveBeenCalledWith({
        name: input.tenantName,
        plan: 'free',
      });
      expect(tenantsRepository.save).toHaveBeenCalledWith(tenant);
      expect(argon2.hash).toHaveBeenCalledWith(input.password);
      expect(usersRepository.create).toHaveBeenCalledWith({
        tenant_id: tenant.tenant_id,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true,
      });
      expect(usersRepository.save).toHaveBeenCalledWith(owner);
    });
  });

  describe('findByEmailAcrossTenants', () => {
    it('should find user across all tenants', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        user_id: 'user_123',
        email,
        tenant_id: 'tenant_123',
      };

      mockUsersRepository.findOne.mockResolvedValue(expectedUser);

      const result = await service.findByEmailAcrossTenants(email);

      expect(result).toEqual(expectedUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['tenant'],
      });
    });

    it('should return null when user not found across tenants', async () => {
      const email = 'notfound@example.com';

      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmailAcrossTenants(email);

      expect(result).toBeNull();
    });
  });

  describe('findByTenant', () => {
    it('should return paginated users for tenant', async () => {
      const input = {
        tenantId: 'tenant_123',
        page: 1,
        limit: 10,
        search: 'john',
        role: 'admin',
      };

      const users = [
        { user_id: 'user_123', email: 'john@example.com', role: 'admin' },
      ];
      const total = 1;

      mockUsersRepository.findAndCount.mockResolvedValue([users, total]);

      const result = await service.findByTenant(input);

      expect(result).toEqual({
        items: users,
        total,
        page: input.page,
        limit: input.limit,
      });
      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: input.tenantId,
        }),
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        order: { created_at: 'DESC' },
      });
    });

    it('should handle search filter', async () => {
      const input = {
        tenantId: 'tenant_123',
        page: 1,
        limit: 10,
        search: 'john',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockUsersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findByTenant(input);

      expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.tenant_id = :tenantId',
        {
          tenantId: input.tenantId,
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${input.search}%` },
      );
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const input = {
        tenantId: 'tenant_123',
        dto: {
          email: 'newuser@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          role: 'member',
          password: 'password123',
        },
      };

      const hashedPassword = 'hashed_password';
      const newUser = {
        user_id: 'user_456',
        tenant_id: input.tenantId,
        ...input.dto,
        password_hash: hashedPassword,
        is_active: true,
      };

      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersRepository.create.mockReturnValue(newUser);
      mockUsersRepository.save.mockResolvedValue(newUser);

      const result = await service.create(input);

      expect(result).toEqual(newUser);
      expect(argon2.hash).toHaveBeenCalledWith(input.dto.password);
      expect(usersRepository.create).toHaveBeenCalledWith({
        tenant_id: input.tenantId,
        email: input.dto.email,
        first_name: input.dto.first_name,
        last_name: input.dto.last_name,
        role: input.dto.role,
        password_hash: hashedPassword,
        is_active: true,
      });
      expect(usersRepository.save).toHaveBeenCalledWith(newUser);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const input = {
        userId: 'user_123',
        tenantId: 'tenant_123',
        dto: {
          first_name: 'Updated',
          last_name: 'Name',
        },
      };

      const updatedUser = { user_id: input.userId, ...input.dto };

      mockUsersRepository.update.mockResolvedValue({ affected: 1 });
      mockUsersRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(input);

      expect(result).toEqual(updatedUser);
      expect(usersRepository.update).toHaveBeenCalledWith(
        { user_id: input.userId, tenant_id: input.tenantId },
        input.dto,
      );
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: input.userId },
      });
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const input = {
        userId: 'user_123',
        tenantId: 'tenant_123',
        role: 'admin',
      };

      const updatedUser = { user_id: input.userId, role: input.role };

      mockUsersRepository.update.mockResolvedValue({ affected: 1 });
      mockUsersRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateRole(input);

      expect(result).toEqual(updatedUser);
      expect(usersRepository.update).toHaveBeenCalledWith(
        { user_id: input.userId, tenant_id: input.tenantId },
        { role: input.role },
      );
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const input = {
        userId: 'user_123',
        tenantId: 'tenant_123',
      };

      mockUsersRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(input);

      expect(usersRepository.delete).toHaveBeenCalledWith({
        user_id: input.userId,
        tenant_id: input.tenantId,
      });
    });
  });
});
