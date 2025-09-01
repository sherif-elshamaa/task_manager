import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('InvitesController', () => {
  let controller: InvitesController;
  let invitesService: InvitesService;

  const mockInvitesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    accept: jest.fn(),
    remove: jest.fn(),
    decline: jest.fn(),
  };

  const mockTenantContextService = {
    getTenantId: jest.fn().mockReturnValue('tenant_123'),
    getUserId: jest.fn().mockReturnValue('user_123'),
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
      controllers: [InvitesController],
      providers: [
        {
          provide: InvitesService,
          useValue: mockInvitesService,
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

    controller = module.get<InvitesController>(InvitesController);
    invitesService = module.get<InvitesService>(InvitesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call invitesService.create with correct parameters', async () => {
      const createInviteDto: CreateInviteDto = {
        email: 'newuser@example.com',
        role: 'member',
        workspaceId: 'workspace_123',
      };
      const expectedInvite = {
        invite_id: 'invite_123',
        email: createInviteDto.email,
        role: createInviteDto.role,
        workspace_id: createInviteDto.workspaceId,
        status: 'pending',
      };

      mockInvitesService.create.mockResolvedValue(expectedInvite);

      const result = await controller.create(createInviteDto);

      expect(invitesService.create).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        dto: createInviteDto,
      });
      expect(result).toEqual(expectedInvite);
    });
  });

  describe('findAll', () => {
    it('should call invitesService.findAll with correct parameters', async () => {
      const page = 1;
      const limit = 10;
      const status = 'pending';
      const workspaceId = 'workspace_123';
      const expectedResult = {
        items: [
          {
            invite_id: 'invite_123',
            email: 'user@example.com',
            status: 'pending',
            workspace_id: 'workspace_123',
          },
        ],
        total: 1,
        page,
        limit,
      };

      mockInvitesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll({
        page,
        limit,
        status,
        workspaceId,
      });

      expect(invitesService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        query: { page, limit, status, workspaceId },
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

      mockInvitesService.findAll.mockResolvedValue(expectedResult);

      await controller.findAll({});

      expect(invitesService.findAll).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        query: {},
      });
    });
  });

  describe('accept', () => {
    it('should call invitesService.accept with correct parameters', async () => {
      const inviteId = 'invite_123';
      const acceptDto = {
        first_name: 'John',
        last_name: 'Doe',
        password: 'password123',
      };
      const expectedResult = {
        user: { user_id: 'user_456', email: 'john@example.com' },
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      mockInvitesService.accept.mockResolvedValue(expectedResult);

      const result = await controller.accept(inviteId);

      expect(invitesService.accept).toHaveBeenCalledWith({
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        id: inviteId,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should call invitesService.remove with correct parameters', async () => {
      const inviteId = 'invite_123';

      mockInvitesService.remove.mockResolvedValue(true);

      const result = await controller.remove(inviteId);

      expect(invitesService.remove).toHaveBeenCalledWith({
        tenantId: 'tenant_123',
        userId: 'user_123',
        id: inviteId,
      });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('decline', () => {
    it('should call invitesService.decline with correct parameters', async () => {
      const inviteId = 'invite_123';
      const expectedResult = { success: true };

      mockInvitesService.decline.mockResolvedValue(expectedResult);

      const result = await controller.decline(inviteId);

      expect(invitesService.decline).toHaveBeenCalledWith({
        tenantId: 'tenant_123',
        userId: 'user_123',
        id: inviteId,
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
