import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto';
import {
  TenantContext,
  TenantContextService,
} from '../shared/tenant-context/tenant-context.service';

describe('TenantsController', () => {
  let controller: TenantsController;
  let tenantsService: TenantsService;

  const mockTenantsService = {
    findOne: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
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
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: mockTenantsService,
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

    controller = module.get<TenantsController>(TenantsController);
    tenantsService = module.get<TenantsService>(TenantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should call tenantsService.findOne with correct parameters', async () => {
      const expectedTenant = {
        tenant_id: mockTenantContext.tenantId,
        name: 'Test Company',
        plan: 'free',
      };

      mockTenantsService.findOne.mockResolvedValue(expectedTenant);

      const result = await controller.findOne(mockTenantContext.tenantId);

      expect(tenantsService.findOne).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
      );
      expect(result).toEqual(expectedTenant);
    });
  });

  describe('update', () => {
    it('should call tenantsService.update with correct parameters', async () => {
      const updateTenantDto: UpdateTenantDto = {
        name: 'Updated Company Name',
      };
      const expectedTenant = {
        tenant_id: mockTenantContext.tenantId,
        ...updateTenantDto,
      };

      mockTenantsService.update.mockResolvedValue(expectedTenant);

      const result = await controller.update(
        mockTenantContext.tenantId,
        updateTenantDto,
      );

      expect(tenantsService.update).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        updateTenantDto,
      );
      expect(result).toEqual(expectedTenant);
    });
  });
});
