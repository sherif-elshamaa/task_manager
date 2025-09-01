import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tracer } from '@opentelemetry/api';
import { Repository, type FindOptionsWhere } from 'typeorm';
import { ActivityLog } from '../entities/activity_log.entity';

// Tests call service.create with camelCase keys; map them internally to snake_case
export interface CreateActivityLogDto {
  tenantId: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  data?: Record<string, any>;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  async create(dto: CreateActivityLogDto): Promise<ActivityLog> {
    return this.tracer.startActiveSpan(
      'ActivityLogsService.create',
      async (span) => {
        span.setAttributes({
          'tenant.id': dto.tenantId,
          'actor.id': dto.actorId,
          'resource.type': dto.resourceType,
          'resource.id': dto.resourceId,
          'log.action': dto.action,
        });

        const snake: Partial<ActivityLog> = {
          tenant_id: dto.tenantId,
          actor_id: dto.actorId,
          resource_type: dto.resourceType,
          resource_id: dto.resourceId,
          action: dto.action,
          data: dto.data,
        };
        const created = this.activityLogRepo.create(snake);
        const saved = await this.activityLogRepo.save(created);
        span.setAttribute('log.id', saved.log_id);
        span.end();
        return saved;
      },
    );
  }

  // Wrappers used by unit tests
  async findAll(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    resourceType?: string;
    resourceId?: string;
    action?: string;
  }) {
    const {
      tenantId,
      page = 1,
      limit = 10,
      resourceType,
      resourceId,
      action,
    } = params;
    return this.findByTenant(
      tenantId,
      page,
      limit,
      resourceType,
      resourceId,
      action,
    );
  }

  async findByResource(params: {
    tenantId: string;
    resourceType: string;
    resourceId: string;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, resourceType, resourceId, page = 1, limit = 10 } = params;
    return this.findByTenant(tenantId, page, limit, resourceType, resourceId);
  }

  async findByTenant(
    tenant_id: string,
    page: number = 1,
    limit: number = 20,
    resource_type?: string,
    resource_id?: string,
    action?: string,
  ): Promise<{
    items: ActivityLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.tracer.startActiveSpan(
      'ActivityLogsService.findByTenant',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenant_id,
          page: page,
          limit: limit,
        });
        if (resource_type) span.setAttribute('resource.type', resource_type);
        if (resource_id) span.setAttribute('resource.id', resource_id);
        if (action) span.setAttribute('log.action', action);

        const where: FindOptionsWhere<ActivityLog> = {
          tenant_id,
          ...(resource_type ? { resource_type } : {}),
          ...(resource_id ? { resource_id } : {}),
          ...(action ? { action } : {}),
        };

        const [items, total] = await this.activityLogRepo.findAndCount({
          where,
          skip: (page - 1) * limit,
          take: limit,
          order: { created_at: 'DESC' },
          relations: ['actor'],
        });

        span.end();
        return { items, total, page, limit };
      },
    );
  }

  async logTaskCreated(
    tenant_id: string,
    actor_id: string,
    task_id: string,
    task_title: string,
  ): Promise<void> {
    await this.create({
      tenantId: tenant_id,
      actorId: actor_id,
      resourceType: 'task',
      resourceId: task_id,
      action: 'created',
      data: { title: task_title },
    });
  }

  async logTaskUpdated(
    tenant_id: string,
    actor_id: string,
    task_id: string,
    changes: Record<string, any>,
  ): Promise<void> {
    await this.create({
      tenantId: tenant_id,
      actorId: actor_id,
      resourceType: 'task',
      resourceId: task_id,
      action: 'updated',
      data: { changes },
    });
  }

  async logTaskAssigned(
    tenant_id: string,
    actor_id: string,
    task_id: string,
    assigned_to: string,
  ): Promise<void> {
    await this.create({
      tenantId: tenant_id,
      actorId: actor_id,
      resourceType: 'task',
      resourceId: task_id,
      action: 'assigned',
      data: { assigned_to },
    });
  }

  async logProjectCreated(
    tenant_id: string,
    actor_id: string,
    project_id: string,
    project_name: string,
  ): Promise<void> {
    await this.create({
      tenantId: tenant_id,
      actorId: actor_id,
      resourceType: 'project',
      resourceId: project_id,
      action: 'created',
      data: { name: project_name },
    });
  }

  async logCommentAdded(
    tenant_id: string,
    actor_id: string,
    task_id: string,
    comment_id: string,
  ): Promise<void> {
    await this.create({
      tenantId: tenant_id,
      actorId: actor_id,
      resourceType: 'comment',
      resourceId: comment_id,
      action: 'added',
      data: { task_id },
    });
  }

  async logUserInvited(
    tenant_id: string,
    actor_id: string,
    invite_id: string,
    email: string,
  ): Promise<void> {
    await this.create({
      tenantId: tenant_id,
      actorId: actor_id,
      resourceType: 'invite',
      resourceId: invite_id,
      action: 'sent',
      data: { email },
    });
  }
}
