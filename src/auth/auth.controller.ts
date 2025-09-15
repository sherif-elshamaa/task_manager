import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../shared/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  LoginDto,
  RefreshDto,
  SignupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import {
  LoginResponseDto,
  SignupResponseDto,
  RefreshResponseDto,
  MeResponseDto,
  MessageResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from './response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../shared/current-user.decorator';
import type { CurrentUserPayload } from '../shared/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Authenticate user and return tokens',
    description: 'Validates user credentials and returns access and refresh tokens along with user information',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful with expanded user and tenant information',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid email or password format' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts. Try again later.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('/signup')
  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === 'test' ? 100 : 3, ttl: 60_000 },
  })
  @ApiOperation({
    summary: 'Register new tenant with owner user',
    description: 'Creates a new tenant organization with an owner user account. Returns access tokens for immediate authentication.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'Tenant and owner user created successfully',
    type: SignupResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation errors in request data' })
  @ApiConflictResponse({ description: 'Email already exists or tenant name is taken' })
  @ApiTooManyRequestsResponse({ description: 'Too many signup attempts. Try again later.' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.owner, dto.tenant_name);
  }

  @Post('refresh')
  @HttpCode(200)
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchanges a valid refresh token for new access and refresh tokens',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: RefreshResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid refresh token format' })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid, expired, or revoked' })
  @ApiTooManyRequestsResponse({ description: 'Too many refresh attempts. Try again later.' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh({ refreshTokenId: dto.refresh_token });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the expanded profile information of the currently authenticated user including tenant details',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired access token' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    // Get expanded user data
    if (!user.sub) {
      throw new UnauthorizedException('User ID not found in token');
    }
    const expandedUser = await this.authService.getUserWithTenant(user.sub);
    return expandedUser;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout current user',
    description: 'Revokes all refresh tokens for the current user, effectively logging them out from all devices',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired access token' })
  async logout(@CurrentUser() user: CurrentUserPayload) {
    // Revoke all refresh tokens for the user
    const sub = user?.sub;
    if (!sub) {
      return { message: 'Missing user id' };
    }
    await this.authService.revokeAll(sub);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the user if the email exists in the system',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (or email not found - same response for security)',
    type: ForgotPasswordResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid email format' })
  @ApiTooManyRequestsResponse({ description: 'Too many password reset attempts. Try again later.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Resets user password using the token received via email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid token or password format' })
  @ApiUnauthorizedResponse({ description: 'Reset token is invalid or expired' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many password reset attempts. Try again later.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
