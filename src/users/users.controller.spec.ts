import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserProfileDto, UpdateUserRoleDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateRole: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('me', () => {
    it('should return current user context', () => {
      const result = controller.me(mockTenantContext);

      expect(result).toEqual({
        userId: mockTenantContext.userId,
        tenantId: mockTenantContext.tenantId,
        roles: mockTenantContext.roles,
      });
    });

    it('should return ok: false when user is undefined', () => {
      const result = controller.me(undefined);

      expect(result).toEqual({ ok: false });
    });
  });

  describe('create', () => {
    it('should call usersService.create with correct parameters', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'member',
        password: 'password123',
      };
      const expectedUser = { user_id: 'user_456', ...createUserDto };

      mockUsersService.create.mockResolvedValue(expectedUser);

      const result = await controller.create(createUserDto, mockTenantContext);

      expect(usersService.create).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        dto: createUserDto,
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findAll', () => {
    it('should call usersService.findAll with correct parameters', async () => {
      const page = 1;
      const limit = 10;
      const search = 'john';
      const role = 'admin';
      const expectedResult = {
        items: [{ user_id: 'user_123', email: 'john@example.com' }],
        total: 1,
        page,
        limit,
      };

      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        page,
        limit,
        search,
        mockTenantContext.tenantId,
      );

      expect(usersService.findAll).toHaveBeenCalledWith({
        page,
        limit,
        search,
        tenantId: mockTenantContext.tenantId,
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

      mockUsersService.findAll.mockResolvedValue(expectedResult);
      await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        tenantId: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should call usersService.findOne with correct parameters', async () => {
      const userId = 'user_456';
      const expectedUser = { user_id: userId, email: 'user@example.com' };

      mockUsersService.findOne.mockResolvedValue(expectedUser);

      const result = await controller.findOne(userId);

      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('update', () => {
    it('should call usersService.update with correct parameters', async () => {
      const userId = 'user_456';
      const updateDto: UpdateUserProfileDto = {
        first_name: 'Updated',
        last_name: 'Name',
      };
      const expectedUser = { user_id: userId, ...updateDto };

      mockUsersService.update.mockResolvedValue(expectedUser);

      const result = await controller.update(userId, updateDto);

      expect(usersService.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('updateRole', () => {
    it('should call usersService.updateRole with correct parameters', async () => {
      const userId = 'user_456';
      const updateRoleDto: UpdateUserRoleDto = {
        role: 'admin',
      };
      const expectedUser = { user_id: userId, role: 'admin' };

      mockUsersService.updateRole.mockResolvedValue(expectedUser);

      const result = await controller.updateRole(userId, updateRoleDto);

      expect(usersService.updateRole).toHaveBeenCalledWith(
        userId,
        updateRoleDto.role,
      );
      expect(result).toEqual(expectedUser);
    });
  });

  describe('remove', () => {
    it('should call usersService.delete with correct parameters', async () => {
      const userId = 'user_456';

      mockUsersService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(userId);

      expect(usersService.remove).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ success: true });
    });
  });
});
