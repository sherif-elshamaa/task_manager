import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh_token.entity';
import { OwnerDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type { Tracer } from '@opentelemetry/api';

@Injectable()
export class AuthService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async validateUser(email: string, password: string) {
    return this.tracer.startActiveSpan(
      'AuthService.validateUser',
      async (span) => {
        span.setAttribute('user.email', email);
        // For login, we need to find user by email across all tenants
        // This is a simplified approach - in production you might want tenant selection
        const user = await this.users.findByEmailAcrossTenants(email);
        if (!user) {
          span.end();
          throw new UnauthorizedException('Invalid credentials');
        }
        const ok = await argon2.verify(user.password_hash, password);
        if (!ok) {
          span.end();
          throw new UnauthorizedException('Invalid credentials');
        }
        span.setAttributes({
          'user.id': user.user_id,
          'tenant.id': user.tenant_id,
        });
        span.end();
        return user;
      },
    );
  }

  async login(email: string, password: string) {
    return this.tracer.startActiveSpan('AuthService.login', async (span) => {
      span.setAttribute('user.email', email);
      const user = await this.validateUser(email, password);
      const payload = {
        sub: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        roles: [user.role],
      };
      const accessToken = this.jwt.sign(payload);
      const refreshToken = await this.issueRefreshToken(user.user_id);
      span.end();
      return { access_token: accessToken, refresh_token: refreshToken };
    });
  }

  // Compatibility with spec tests
  async logout(refreshTokenId: string) {
    return this.revokeById(refreshTokenId);
  }

  async signup(ownerDto: OwnerDto, tenantName: string) {
    return this.tracer.startActiveSpan('AuthService.signup', async (span) => {
      span.setAttributes({
        'user.email': ownerDto.email,
        'tenant.name': tenantName,
      });
      const { tenant, owner } = await this.users.createTenantWithOwner({
        tenantName,
        firstName: ownerDto.first_name,
        lastName: ownerDto.last_name,
        email: ownerDto.email,
        password: ownerDto.password,
      });
      span.setAttributes({
        'user.id': owner.user_id,
        'tenant.id': tenant.tenant_id,
      });
      const payload = {
        sub: owner.user_id,
        email: owner.email,
        tenantId: tenant.tenant_id,
        roles: ['owner'],
      };

      const accessToken = this.jwt.sign(payload);
      const refreshToken = await this.issueRefreshToken(owner.user_id);

      span.end();

      return {
        tenant,
        user: owner,
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    });
  }

  async issueRefreshToken(userId: string): Promise<string> {
    return this.tracer.startActiveSpan(
      'AuthService.issueRefreshToken',
      async (span) => {
        span.setAttribute('user.id', userId);
        const token = await argon2.hash(Date.now().toString() + userId);
        // Look up user to attach tenant_id for rotation & revocation per tenant
        const user = await this.users.findById(userId);
        const refreshRecord = this.refreshRepo.create({
          user_id: userId,
          tenant_id: user?.tenant_id as string,
          token_hash: token,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
        });
        const saved = await this.refreshRepo.save(refreshRecord);
        span.setAttribute('refresh_token.id', saved.id);
        span.end();
        return saved.id;
      },
    );
  }

  async refresh(input: { refreshTokenId: string }) {
    return this.tracer.startActiveSpan('AuthService.refresh', async (span) => {
      span.setAttribute('refresh_token.id', input.refreshTokenId);
      const record = await this.refreshRepo.findOne({
        where: { id: input.refreshTokenId },
      });
      if (!record || record.revoked || record.expires_at < new Date()) {
        span.end();
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.users.findById(record.user_id);
      if (!user) {
        span.end();
        throw new UnauthorizedException('Invalid user');
      }
      span.setAttribute('user.id', user.user_id);
      record.revoked = true;
      await this.refreshRepo.save(record);

      // Generate new tokens without re-validating password
      const payload = {
        sub: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        roles: [user.role],
      };
      const accessToken = this.jwt.sign(payload);
      const refreshToken = await this.issueRefreshToken(user.user_id);
      span.end();
      return { access_token: accessToken, refresh_token: refreshToken };
    });
  }

  async revokeAll(userId: string) {
    return this.tracer.startActiveSpan(
      'AuthService.revokeAll',
      async (span) => {
        span.setAttribute('user.id', userId);
        const result = await this.refreshRepo.update(
          { user_id: userId, revoked: false },
          { revoked: true },
        );
        span.setAttribute('revoked_count', result.affected ?? 0);
        span.end();
        return { revoked: result.affected ?? 0 };
      },
    );
  }

  async revokeById(refreshTokenId: string) {
    return this.tracer.startActiveSpan(
      'AuthService.revokeById',
      async (span) => {
        span.setAttribute('refresh_token.id', refreshTokenId);
        await this.refreshRepo.update(
          { id: refreshTokenId },
          { revoked: true },
        );
        span.end();
        return { revoked: true };
      },
    );
  }

  async forgotPassword(email: string) {
    return this.tracer.startActiveSpan(
      'AuthService.forgotPassword',
      async (span) => {
        span.setAttribute('user.email', email);
        const user = await this.users.findByEmailAcrossTenants(email);
        if (!user) {
          // Don't reveal if user exists or not for security
          span.end();
          return {
            message:
              'If an account with that email exists, a password reset link has been sent.',
          };
        }
        span.setAttribute('user.id', user.user_id);

        // Generate reset token (in production, this should be stored in DB with expiration)
        const resetToken = uuidv4();
        const resetExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        // Store reset token in user metadata (in production, use a separate table)
        await this.users.updateUserMetadata(user.user_id, {
          resetToken,
          resetExpiry: resetExpiry.toISOString(),
        });

        // Queue password reset email
        await this.emailQueue.add('password-reset', {
          email: user.email,
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
        });

        span.end();
        return {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      },
    );
  }

  async resetPassword(token: string, newPassword: string) {
    return this.tracer.startActiveSpan(
      'AuthService.resetPassword',
      async (span) => {
        // Find user with this reset token
        const user = await this.users.findByResetToken(token);
        if (!user) {
          span.end();
          throw new BadRequestException('Invalid or expired reset token');
        }
        span.setAttribute('user.id', user.user_id);

        // Check if token is expired
        const metadata = (user.metadata ?? {}) as Record<string, unknown>;
        const resetExpiryStr =
          typeof metadata.resetExpiry === 'string'
            ? metadata.resetExpiry
            : null;
        if (!resetExpiryStr || new Date(resetExpiryStr) < new Date()) {
          span.end();
          throw new BadRequestException('Reset token has expired');
        }

        // Update password and clear reset token
        const passwordHash = await argon2.hash(newPassword);
        await this.users.updatePassword(user.user_id, passwordHash);
        await this.users.updateUserMetadata(user.user_id, {
          resetToken: null,
          resetExpiry: null,
        });

        // Revoke all existing refresh tokens for security
        await this.revokeAll(user.user_id);

        span.end();
        return { message: 'Password has been reset successfully' };
      },
    );
  }
}
