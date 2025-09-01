import {
  Inject,
  Injectable,
  Optional,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Project } from '../entities/project.entity';
import { Comment } from '../entities/comment.entity';
import { ActivityLog } from '../entities/activity_log.entity';
import {
  DataExportRequestDto,
  DataDeletionRequestDto,
} from './dto/data-export.dto';
import type { Tracer } from '@opentelemetry/api';

@Injectable()
export class TenantsService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @Optional()
    @InjectRepository(Comment)
    private readonly commentsRepo?: Repository<Comment>,
    @Optional()
    @InjectRepository(ActivityLog)
    private readonly activityLogsRepo?: Repository<ActivityLog>,
  ) {}

  async create(input: { name: string; plan?: string }): Promise<Tenant> {
    return this.tracer.startActiveSpan(
      'TenantsService.create',
      async (span) => {
        span.setAttributes({
          'tenant.name': input.name,
          'tenant.plan': input.plan ?? 'free',
        });
        const tenant = this.tenantsRepo.create({
          name: input.name,
          plan: input.plan ?? 'free',
          status: 'active',
        } as DeepPartial<Tenant>);
        const savedTenant = await this.tenantsRepo.save(tenant);
        span.setAttribute('tenant.id', savedTenant.tenant_id);
        span.end();
        return savedTenant;
      },
    );
  }

  // Methods used by unit tests
  async getUsage(tenantId: string) {
    const users = await this.usersRepo.count({
      where: { tenant_id: tenantId },
    });
    const projects = await this.projectsRepo.count({
      where: { tenant: { tenant_id: tenantId } },
    });
    const tasks = await this.tasksRepo.count({
      where: { tenant_id: tenantId },
    });
    return {
      users,
      projects,
      tasks,
      storage_used: 0,
      limits: {
        max_users: 100,
        max_projects: 50,
        max_tasks: 1000,
        max_storage: 5_000_000_000,
      },
    };
  }

  async updatePlan(input: { tenantId: string; plan: string }) {
    await this.tenantsRepo.update({ tenant_id: input.tenantId }, {
      plan: input.plan,
    } as DeepPartial<Tenant>);
    return this.tenantsRepo.findOne({ where: { tenant_id: input.tenantId } });
  }
  async findAll(input: { page: number; limit: number; search?: string }) {
    return this.tracer.startActiveSpan(
      'TenantsService.findAll',
      async (span) => {
        span.setAttributes({
          'page.number': input.page,
          'page.limit': input.limit,
          'search.term': input.search ?? '',
        });
        if (input.search) {
          const qb = this.tenantsRepo
            .createQueryBuilder('tenant')
            .where('tenant.name ILIKE :search', {
              search: `%${input.search}%`,
            })
            .skip((input.page - 1) * input.limit)
            .take(input.limit)
            .orderBy('tenant.created_at', 'DESC');
          const [items, total] = await qb.getManyAndCount();
          span.end();
          return { items, total, page: input.page, limit: input.limit };
        }
        const [items, total] = await this.tenantsRepo.findAndCount({
          where: {},
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          order: { created_at: 'DESC' },
        });
        span.end();
        return { items, total, page: input.page, limit: input.limit };
      },
    );
  }

  async findOne(id: string): Promise<Tenant | null> {
    return this.tracer.startActiveSpan(
      'TenantsService.findOne',
      async (span) => {
        span.setAttribute('tenant.id', id);
        const tenant = await this.tenantsRepo.findOne({
          where: { tenant_id: id },
        });
        if (!tenant) {
          span.end();
          return null;
        }
        span.end();
        return tenant;
      },
    );
  }

  // Align with tests signature: support both update(id, dto) and update({ tenantId, dto })
  async update(
    tenantId: string,
    dto: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>,
  ): Promise<Tenant | null>;
  async update(input: {
    tenantId: string;
    dto: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>;
  }): Promise<Tenant | null>;
  async update(
    a:
      | string
      | {
          tenantId: string;
          dto: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>;
        },
    b?: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>,
  ): Promise<Tenant | null> {
    return this.tracer.startActiveSpan(
      'TenantsService.update',
      async (span) => {
        const { tenantId, dto } = this.unpackUpdateParams(a, b);
        span.setAttribute('tenant.id', tenantId);
        await this.tenantsRepo.update({ tenant_id: tenantId }, dto);
        const updatedTenant = await this.tenantsRepo.findOne({
          where: { tenant_id: tenantId },
        });
        span.end();
        return updatedTenant;
      },
    );
  }

  private unpackUpdateParams(
    a:
      | string
      | {
          tenantId: string;
          dto: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>;
        },
    b?: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>,
  ) {
    const tenantId = typeof a === 'string' ? a : a.tenantId;
    const dto = (typeof a === 'string' ? b : a.dto) as DeepPartial<Tenant>;
    return { tenantId, dto };
  }

  async remove(id: string) {
    return this.tracer.startActiveSpan(
      'TenantsService.remove',
      async (span) => {
        span.setAttribute('tenant.id', id);
        await this.tenantsRepo.delete({ tenant_id: id });
        span.end();
        return { deleted: true, tenant_id: id };
      },
    );
  }

  async exportData(tenantId: string, _request: DataExportRequestDto) {
    return this.tracer.startActiveSpan(
      'TenantsService.exportData',
      async (span) => {
        span.setAttribute('tenant.id', tenantId);
        await this.findOne(tenantId);

        // In a real implementation, you would:
        // 1. Queue this as a background job
        // 2. Generate the export file (JSON/CSV)
        // 3. Store it securely (S3)
        // 4. Send download link via email
        // 5. Auto-delete after retention period

        const exportId = `export_${Date.now()}`;
        span.setAttribute('export.id', exportId);
        span.end();
        return {
          message: 'Data export initiated',
          exportId,
          estimatedCompletion: new Date(Date.now() + 300000), // 5 minutes
          downloadAvailable: false,
        };
      },
    );
  }

  async requestDataDeletion(tenantId: string, request: DataDeletionRequestDto) {
    return this.tracer.startActiveSpan(
      'TenantsService.requestDataDeletion',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'user.id': request.user_id,
        });
        await this.findOne(tenantId);

        // In a real implementation, you would:
        // 1. Create a deletion request record
        // 2. Queue background jobs for data deletion
        // 3. Implement soft delete with retention period
        // 4. Log all deletion activities
        // 5. Send confirmation emails

        const deletionId = `deletion_${Date.now()}`;
        const retentionPeriod = request.retention_period || '30d';
        span.setAttributes({
          'deletion.id': deletionId,
          'deletion.retention_period': retentionPeriod,
        });

        // Log the deletion request
        if (this.activityLogsRepo) {
          await this.activityLogsRepo.save({
            tenant_id: tenantId,
            actor_id: request.user_id || 'system',
            resource_type: 'tenant',
            resource_id: tenantId,
            action: 'data_deletion_requested',
            data: {
              reason: request.reason,
              retention_period: retentionPeriod,
              deletion_id: deletionId,
            },
          });
        }

        span.end();
        return {
          message: 'Data deletion request initiated',
          deletionId,
          retentionPeriod,
          scheduledDeletion: new Date(
            Date.now() + this.parseRetentionPeriod(retentionPeriod),
          ),
          status: 'pending',
        };
      },
    );
  }

  async getDataRetentionStatus(tenantId: string) {
    const tenant = await this.findOne(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Get deletion requests
    const deletionRequests = this.activityLogsRepo
      ? await this.activityLogsRepo.find({
          where: {
            tenant_id: tenantId,
            action: 'data_deletion_requested',
          },
          order: { created_at: 'DESC' },
        })
      : [];

    // Calculate data metrics
    const userCount = await this.usersRepo.count({
      where: { tenant_id: tenantId },
    });
    const projectCount = await this.projectsRepo.count({
      where: { tenant: { tenant_id: tenantId } },
    });
    const taskCount = await this.tasksRepo.count({
      where: { tenant_id: tenantId },
    });
    // commentsRepo may be undefined in unit tests
    const commentCount = this.commentsRepo
      ? await this.commentsRepo.count({ where: { tenant_id: tenantId } })
      : 0;

    return {
      tenant: {
        id: tenant.tenant_id,
        name: tenant.name,
        status: tenant.status,
        created_at: tenant.created_at,
      },
      dataMetrics: {
        users: userCount,
        projects: projectCount,
        tasks: taskCount,
        comments: commentCount,
      },
      deletionRequests: deletionRequests.map((req) => {
        const data = (req.data ?? {}) as {
          deletion_id?: string;
          reason?: string;
          retention_period?: string;
        };
        return {
          id: data.deletion_id,
          reason: data.reason,
          requested_at: req.created_at,
          retention_period: data.retention_period,
          status: 'pending',
        };
      }),
      retentionPolicy: {
        default_period: '7y', // 7 years default
        backup_retention: '30d',
        log_retention: '2y',
      },
    };
  }

  private parseRetentionPeriod(period: string): number {
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

    const [, num, unit] = match;
    const value = parseInt(num, 10);

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 30 * 24 * 60 * 60 * 1000;
      case 'y':
        return value * 365 * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
