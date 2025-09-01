import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshDto,
  SignupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    signup: jest.fn(),
    refresh: jest.fn(),
    revokeAll: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signup', () => {
    it('should call authService.signup with correct parameters', async () => {
      const signupDto: SignupDto = {
        owner: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'password123',
        },
        tenant_name: 'Test Company',
      };
      const expectedResult = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      mockAuthService.signup.mockResolvedValue(expectedResult);

      const result = await controller.signup(signupDto);

      expect(authService.signup).toHaveBeenCalledWith(
        signupDto.owner,
        signupDto.tenant_name,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with correct parameters', async () => {
      const refreshDto: RefreshDto = {
        refresh_token: 'refresh_token_123',
      };
      const expectedResult = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      mockAuthService.refresh.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshDto);

      expect(authService.refresh).toHaveBeenCalledWith({
        refreshTokenId: refreshDto.refresh_token,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('me', () => {
    it('should return user information from token', async () => {
      const user = {
        sub: 'user_123',
        email: 'test@example.com',
        tenant_id: 'tenant_123',
        roles: ['admin'],
      };

      const result = await controller.me(user);

      expect(result).toEqual({
        user_id: user.sub,
        email: user.email,
        tenant_id: user.tenant_id,
        roles: user.roles,
      });
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user information', async () => {
      const user = {
        sub: 'user_123',
        email: 'test@example.com',
        tenant_id: 'tenant_123',
        roles: ['admin'],
      };

      mockAuthService.revokeAll.mockResolvedValue(undefined);

      const result = await controller.logout(user);

      expect(authService.revokeAll).toHaveBeenCalledWith(user.sub);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
