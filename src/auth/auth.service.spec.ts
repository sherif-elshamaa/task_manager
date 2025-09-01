import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../entities/refresh_token.entity';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let emailQueue: any;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUsersService = {
    findByEmailAcrossTenants: jest.fn(),
    createTenantWithOwner: jest.fn(),
    findById: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getQueueToken('email'),
          useValue: mockEmailQueue,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    emailQueue = module.get(getQueueToken('email'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user = {
        user_id: 'user_123',
        email,
        password_hash: 'hashed_password',
        tenant_id: 'tenant_123',
        role: 'admin',
      };

      mockUsersService.findByEmailAcrossTenants.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(user);
      expect(usersService.findByEmailAcrossTenants).toHaveBeenCalledWith(email);
      expect(argon2.verify).toHaveBeenCalledWith(user.password_hash, password);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockUsersService.findByEmailAcrossTenants.mockResolvedValue(null);

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.findByEmailAcrossTenants).toHaveBeenCalledWith(email);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrong_password';
      const user = {
        user_id: 'user_123',
        email,
        password_hash: 'hashed_password',
        tenant_id: 'tenant_123',
        role: 'admin',
      };

      mockUsersService.findByEmailAcrossTenants.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(argon2.verify).toHaveBeenCalledWith(user.password_hash, password);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user = {
        user_id: 'user_123',
        email,
        password_hash: 'hashed_password',
        tenant_id: 'tenant_123',
        role: 'admin',
      };
      const accessToken = 'access_token';
      const refreshToken = 'refresh_token';

      mockUsersService.findByEmailAcrossTenants.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(accessToken);

      // Mock issueRefreshToken method
      jest.spyOn(service, 'issueRefreshToken').mockResolvedValue(refreshToken);

      const result = await service.login(email, password);

      expect(result).toEqual({ accessToken, refreshToken });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        roles: [user.role],
      });
    });
  });

  describe('signup', () => {
    it('should create tenant with owner and return tokens', async () => {
      const ownerDto = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      const tenantName = 'Test Company';
      const tenant = { tenant_id: 'tenant_123', name: tenantName };
      const owner = {
        user_id: 'user_123',
        email: ownerDto.email,
        tenant_id: 'tenant_123',
        role: 'admin',
      };
      const accessToken = 'access_token';
      const refreshToken = 'refresh_token';

      mockUsersService.createTenantWithOwner.mockResolvedValue({
        tenant,
        owner,
      });
      mockJwtService.sign.mockReturnValue(accessToken);
      jest.spyOn(service, 'issueRefreshToken').mockResolvedValue(refreshToken);

      const result = await service.signup(ownerDto, tenantName);

      expect(result).toEqual({ accessToken, refreshToken });
      expect(usersService.createTenantWithOwner).toHaveBeenCalledWith({
        tenantName,
        firstName: ownerDto.first_name,
        lastName: ownerDto.last_name,
        email: ownerDto.email,
        password: ownerDto.password,
      });
    });
  });

  describe('refresh', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const refreshTokenId = 'refresh_token_123';
      const refreshToken = {
        token_id: refreshTokenId,
        user_id: 'user_123',
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
      };
      const user = {
        user_id: 'user_123',
        email: 'test@example.com',
        tenant_id: 'tenant_123',
        role: 'admin',
      };
      const accessToken = 'new_access_token';
      const newRefreshToken = 'new_refresh_token';

      mockRefreshTokenRepository.findOne.mockResolvedValue(refreshToken);
      mockUsersService.findById.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(accessToken);
      jest
        .spyOn(service, 'issueRefreshToken')
        .mockResolvedValue(newRefreshToken);

      const result = await service.refresh({ refreshTokenId });

      expect(result).toEqual({ accessToken, refreshToken: newRefreshToken });
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token_id: refreshTokenId },
      });
    });

    it('should throw UnauthorizedException when refresh token not found', async () => {
      const refreshTokenId = 'invalid_token';

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh({ refreshTokenId })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const refreshTokenId = 'expired_token';
      const expiredRefreshToken = {
        token_id: refreshTokenId,
        user_id: 'user_123',
        expires_at: new Date(Date.now() - 1000), // 1 second ago
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(expiredRefreshToken);

      await expect(service.refresh({ refreshTokenId })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      const userId = 'user_123';

      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 2 });

      await service.logout(userId);

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        user_id: userId,
      });
    });
  });
});
