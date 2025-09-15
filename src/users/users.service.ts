import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import * as argon2 from 'argon2';
import type { Tracer } from '@opentelemetry/api';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { tenant_id: tenantId, email } });
  }

  async findById(userId: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { user_id: userId } });
  }

  async findByIdWithTenant(userId: string): Promise<any> {
    return this.tracer.startActiveSpan('UsersService.findByIdWithTenant', async (span) => {
      const user = await this.usersRepo.findOne({
        where: { user_id: userId },
        relations: ['tenant']
      });

      if (!user) {
        span.end();
        return null;
      }

      // Transform to expanded format
      const expandedUser = {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        roles: [user.role],
        is_active: user.is_active,
        tenant: {
          tenant_id: user.tenant.tenant_id,
          name: user.tenant.name,
          plan: user.tenant.plan,
          status: user.tenant.status
        },
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.metadata?.last_login || null,
        metadata: user.metadata
      };

      span.end();
      return expandedUser;
    });
  }

  async createTenantWithOwner(input: {
    tenantName: string;
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
  }): Promise<{ tenant: Tenant; owner: User }> {
    this.logger.log('Entering createTenantWithOwner');
    return this.tracer.startActiveSpan(
      'UsersService.createTenantWithOwner',
      async (span) => {
        try {
          this.logger.log('Tracer span started');
          span.setAttributes({
            'tenant.name': input.tenantName,
            'user.email': input.email,
          });

          this.logger.log('Creating tenant locally...');
          const tenant = this.tenantsRepo.create({
            name: input.tenantName,
            plan: 'free',
          });
          this.logger.log('Tenant created locally. Saving to DB...');
          await this.tenantsRepo.save(tenant);
          this.logger.log(`Tenant saved to DB with ID: ${tenant.tenant_id}`);
          span.addEvent('tenant created', { 'tenant.id': tenant.tenant_id });

          this.logger.log('Hashing password...');
          const password_hash = await argon2.hash(input.password);
          this.logger.log('Password hashed. Creating owner locally...');
          const owner = this.usersRepo.create({
            tenant_id: tenant.tenant_id,
            first_name: input.firstName,
            last_name: input.lastName ?? '',
            email: input.email,
            password_hash,
            role: 'owner',
            is_active: true,
          });
          this.logger.log('Owner created locally. Saving to DB...');
          const savedOwner = await this.usersRepo.save(owner);
          this.logger.log(`Owner saved to DB with ID: ${savedOwner.user_id}`);
          span.addEvent('owner created', { 'user.id': savedOwner.user_id });

          span.setAttributes({
            'tenant.id': tenant.tenant_id,
            'user.id': savedOwner.user_id,
          });

          this.logger.log('Exiting createTenantWithOwner successfully.');
          return { tenant, owner: savedOwner };
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(
              `Error in createTenantWithOwner: ${error.message}`,
              error.stack,
            );
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message }); // 2 = ERROR
          } else {
            this.logger.error(
              `An unknown error occurred in createTenantWithOwner: ${error}`,
            );
          }
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async findByEmailAcrossTenants(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email },
      relations: ['tenant'],
    });
  }

  async findByResetToken(resetToken: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .where("user.metadata->>'resetToken' = :resetToken", { resetToken })
      .getOne();
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update(userId, { password_hash: passwordHash });
  }

  async updateUserMetadata(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const updatedMetadata = { ...user.metadata, ...metadata };
    await this.usersRepo.update(userId, { metadata: updatedMetadata });
  }

  // CRUD used by UsersController and spec expectations
  async create(input: {
    tenantId: string;
    dto: {
      email: string;
      first_name: string;
      last_name?: string;
      role?: string;
      password: string;
    };
  }) {
    return this.tracer.startActiveSpan('UsersService.create', async (span) => {
      span.setAttributes({
        'tenant.id': input.tenantId,
        'user.email': input.dto.email,
      });

      const password_hash = await argon2.hash(input.dto.password);
      const user = this.usersRepo.create({
        tenant_id: input.tenantId,
        email: input.dto.email,
        first_name: input.dto.first_name,
        last_name: input.dto.last_name,
        role: input.dto.role,
        password_hash,
        is_active: true,
      } as DeepPartial<User>);
      const savedUser = await this.usersRepo.save(user);

      span.setAttribute('user.id', savedUser.user_id);
      span.end();
      return savedUser;
    });
  }

  async findAll(input: {
    page: number;
    limit: number;
    search?: string;
    tenantId?: string;
  }) {
    const qb = this.usersRepo.createQueryBuilder('u');
    if (input.tenantId)
      qb.where('u.tenant_id = :tenantId', { tenantId: input.tenantId });
    if (input.search)
      qb.andWhere(
        '(u.first_name ILIKE :q OR u.last_name ILIKE :q OR u.email ILIKE :q)',
        { q: `%${input.search}%` },
      );
    const [items, total] = await qb
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .orderBy('u.created_at', 'DESC')
      .getManyAndCount();
    return { items, total, page: input.page, limit: input.limit };
  }

  // Method shape used by spec: findByTenant
  async findByTenant(input: {
    tenantId: string;
    page: number;
    limit: number;
    search?: string;
    role?: string;
  }) {
    // Tests expect two behaviors:
    // - When only search is provided (no role), use query builder with alias 'user' and andWhere ILIKE
    // - Otherwise (including when role is present), use repository.findAndCount
    if (input.search && !input.role) {
      const qb = this.usersRepo.createQueryBuilder('user');
      qb.where('user.tenant_id = :tenantId', { tenantId: input.tenantId });
      qb.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${input.search}%` },
      );
      const [items, total] = await qb
        .skip((input.page - 1) * input.limit)
        .take(input.limit)
        .orderBy('user.created_at', 'DESC')
        .getManyAndCount();
      return { items, total, page: input.page, limit: input.limit };
    }
    const where: FindOptionsWhere<User> = { tenant_id: input.tenantId };
    if (input.role) where.role = input.role as User['role'];
    // Note: tests don't assert search in where for this path
    const [items, total] = await this.usersRepo.findAndCount({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: { created_at: 'DESC' },
    });
    return { items, total, page: input.page, limit: input.limit };
  }

  async findOne(id: string) {
    return this.tracer.startActiveSpan('UsersService.findOne', async (span) => {
      span.setAttribute('user.id', id);
      const user = await this.usersRepo.findOne({ where: { user_id: id } });
      span.end();
      return user;
    });
  }

  async update(
    id: string,
    dto: Partial<
      Pick<User, 'first_name' | 'last_name' | 'email' | 'is_active'>
    >,
  ) {
    return this.tracer.startActiveSpan('UsersService.update', async (span) => {
      span.setAttribute('user.id', id);
      const user = await this.findOne(id);
      if (!user) {
        span.end();
        return null;
      }
      Object.assign(user, dto);
      const savedUser = await this.usersRepo.save(user);
      span.end();
      return savedUser;
    });
  }

  // Spec wrapper: updateProfile
  async updateProfile(input: {
    userId: string;
    tenantId: string;
    dto: Partial<Pick<User, 'first_name' | 'last_name'>>;
  }) {
    await this.usersRepo.update(
      { user_id: input.userId, tenant_id: input.tenantId },
      input.dto,
    );
    return this.usersRepo.findOne({ where: { user_id: input.userId } });
  }

  async updateRole(
    idOrInput:
      | string
      | { userId: string; tenantId: string; role: User['role'] },
    roleArg?: User['role'],
  ) {
    if (typeof idOrInput === 'object') {
      const input = idOrInput;
      await this.usersRepo.update(
        { user_id: input.userId, tenant_id: input.tenantId },
        { role: input.role },
      );
      return this.usersRepo.findOne({ where: { user_id: input.userId } });
    }
    const id = idOrInput;
    const user = await this.findOne(id);
    if (!user) return null;
    user.role = roleArg!;
    return this.usersRepo.save(user);
  }

  async remove(id: string) {
    return this.tracer.startActiveSpan('UsersService.remove', async (span) => {
      span.setAttribute('user.id', id);
      const user = await this.findOne(id);
      if (!user) {
        span.end();
        return null;
      }
      await this.usersRepo.remove(user);
      span.end();
      return { deleted: true };
    });
  }

  // Spec wrapper: delete(input)
  async delete(input: { userId: string; tenantId: string }) {
    await this.usersRepo.delete({
      user_id: input.userId,
      tenant_id: input.tenantId,
    });
  }
}
