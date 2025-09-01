import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../shared/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  LoginDto,
  RefreshDto,
  SignupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
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
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('/signup')
  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === 'test' ? 100 : 3, ttl: 60_000 },
  })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.owner, dto.tenant_name);
  }

  @Post('refresh')
  @HttpCode(200)
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh({ refreshTokenId: dto.refresh_token });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserPayload) {
    return {
      user_id: user.sub,
      email: user.email,
      tenant_id: user.tenant_id,
      roles: user.roles ?? (user.role ? [user.role] : []),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
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
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
