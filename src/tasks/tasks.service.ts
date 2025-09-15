import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tracer } from '@opentelemetry/api';
import { In, Repository } from 'typeorm';
import { findOneByTenant } from '../shared/tenant/tenant-scope';
import { Task } from '../entities/task.entity';
import { Project } from '../entities/project.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrometheusService } from '../shared/monitoring/prometheus.service';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../shared/pagination/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
    private readonly prometheusService: PrometheusService,
  ) {}

  async create(input: {
    tenantId: string;
    projectId: string;
    userId: string;
    dto: CreateTaskDto;
  }) {
    return this.tracer.startActiveSpan('TasksService.create', async (span) => {
      const { tenantId, projectId, userId, dto } = input;
      span.setAttributes({
        'tenant.id': tenantId,
        'project.id': projectId,
        'user.id': userId,
      });

      // Validate that the project exists and belongs to the tenant
      const project = await this.projectsRepo.findOne({
        where: { project_id: projectId, tenant: { tenant_id: tenantId } },
      });

      if (!project) {
        span.end();
        throw new NotFoundException('Project not found');
      }

      const task = this.tasksRepo.create({
        ...dto,
        tenant_id: tenantId,
        project_id: projectId,
        created_by: userId,
        updated_by: userId,
      });

      const savedTask = await this.tasksRepo.save(task);
      this.prometheusService.recordTaskCreated(
        tenantId,
        projectId,
        savedTask.priority,
      );
      span.setAttribute('task.id', savedTask.task_id);
      span.end();
      return savedTask;
    });
  }

  async list(input: {
    tenantId: string;
    projectId: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Task>> {
    const {
      tenantId,
      projectId,
      status,
      priority,
      assignedTo,
      search,
      page = 1,
      limit = 20,
    } = input;

    const qb = this.tasksRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId AND t.project_id = :projectId', {
        tenantId,
        projectId,
      })
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('t.status = :status', { status });
    }
    if (priority) {
      qb.andWhere('t.priority = :priority', { priority });
    }
    if (assignedTo) {
      qb.andWhere('t.assigned_to = :assignedTo', { assignedTo });
    }
    if (search) {
      qb.andWhere('t.title ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return createPaginatedResponse(data, total, page, limit);
  }

  async listAll(input: {
    tenantId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Task>> {
    const {
      tenantId,
      projectId,
      status,
      priority,
      search,
      page = 1,
      limit = 20,
    } = input;

    const qb = this.tasksRepo
      .createQueryBuilder('t')
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) {
      qb.andWhere('t.tenant_id = :tenantId', { tenantId });
    }
    if (projectId) {
      qb.andWhere('t.project_id = :projectId', { projectId });
    }
    if (status) {
      qb.andWhere('t.status = :status', { status });
    }
    if (priority) {
      qb.andWhere('t.priority = :priority', { priority });
    }
    if (search) {
      qb.andWhere('t.title ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(tenantId: string, taskId: string) {
    return this.tracer.startActiveSpan('TasksService.findOne', async (span) => {
      span.setAttributes({
        'tenant.id': tenantId,
        'task.id': taskId,
      });
      const task = await findOneByTenant(this.tasksRepo, tenantId, {
        task_id: taskId,
      });
      span.end();
      return task;
    });
  }

  async remove(input: {
    tenantId: string;
    id: string;
  }): Promise<{ deleted: boolean; task_id: string } | null> {
    return this.tracer.startActiveSpan('TasksService.remove', async (span) => {
      const { tenantId, id } = input;
      span.setAttributes({
        'tenant.id': tenantId,
        'task.id': id,
      });

      const task = await findOneByTenant(this.tasksRepo, tenantId, {
        task_id: id,
      });
      if (!task) {
        span.end();
        return null;
      }

      await this.tasksRepo.remove(task);
      span.end();
      return { deleted: true, task_id: id };
    });
  }

  async update(input: {
    tenantId: string;
    taskId: string;
    userId: string;
    dto: UpdateTaskDto;
  }) {
    return this.tracer.startActiveSpan('TasksService.update', async (span) => {
      const { tenantId, taskId, userId, dto } = input;
      span.setAttributes({
        'tenant.id': tenantId,
        'task.id': taskId,
        'user.id': userId,
      });

      const task = await findOneByTenant(this.tasksRepo, tenantId, {
        task_id: taskId,
      });

      if (!task) {
        span.end();
        return null;
      }

      const oldAssignee = task.assigned_to;

      // Update fields if provided
      if (dto.title !== undefined) {
        task.title = dto.title;
      }
      if (dto.description !== undefined) {
        task.description = dto.description ?? null;
      }
      if (dto.status !== undefined) {
        task.status = dto.status;
      }
      if (dto.priority !== undefined) {
        task.priority = dto.priority;
      }
      if (dto.assigned_to !== undefined) {
        task.assigned_to = dto.assigned_to ?? null;
      }
      if (dto.start_date !== undefined) {
        task.start_date = dto.start_date ?? null;
      }
      if (dto.due_date !== undefined) {
        task.due_date = dto.due_date ?? null;
      }
      if (dto.estimate_minutes !== undefined) {
        task.estimate_minutes = dto.estimate_minutes ?? null;
      }

      // attachments are managed via dedicated methods
      // Maintain audit field
      task.updated_by = userId;
      const updatedTask = await this.tasksRepo.save(task);

      // If assignee changed, send a notification
      if (updatedTask.assigned_to && updatedTask.assigned_to !== oldAssignee) {
        span.addEvent('Assignee changed, sending notification');
        await this.notificationsQueue.add('task-assigned', {
          tenantId: updatedTask.tenant_id,
          assigneeId: updatedTask.assigned_to,
          taskId: updatedTask.task_id,
          assignerId: userId,
        });
      }

      span.end();
      return updatedTask;
    });
  }

  async addAttachment({
    tenantId,
    taskId,
    attachment,
  }: {
    tenantId: string;
    taskId: string;
    attachment: {
      key: string;
      filename: string;
      size: number;
      mime_type: string;
    };
  }) {
    const task = await this.tasksRepo.findOne({
      where: { task_id: taskId, tenant_id: tenantId },
    });
    if (!task) return null;
    task.attachments = (task.attachments || []).concat(attachment);
    return this.tasksRepo.save(task);
  }

  async removeAttachment({
    tenantId,
    taskId,
    key,
  }: {
    tenantId: string;
    taskId: string;
    key: string;
  }) {
    const task = await this.tasksRepo.findOne({
      where: { task_id: taskId, tenant_id: tenantId },
    });
    if (!task) return null;
    const list = [...(task.attachments ?? [])];
    task.attachments = list.filter((a) => a.key !== key);
    await this.tasksRepo.save(task);
    return { deleted: true };
  }

  async bulkUpdate({
    tenantId,
    userId: _userId,
    taskIds,
    updates,
  }: {
    tenantId: string;
    userId: string;
    taskIds: string[];
    updates: Partial<CreateTaskDto>;
  }) {
    // reference to satisfy no-unused-vars rule
    void _userId;
    const tasks = await this.tasksRepo.find({
      where: { task_id: In(taskIds), tenant_id: tenantId },
    });

    if (tasks.length === 0) return { updated: 0 };

    const updatedTasks = tasks.map((task) => {
      Object.assign(task, updates);
      return task;
    });

    const saved = await this.tasksRepo.save(updatedTasks);
    return { updated: saved.length, tasks: saved };
  }

  async bulkDelete({
    tenantId,
    userId: _userId,
    taskIds,
  }: {
    tenantId: string;
    userId: string;
    taskIds: string[];
  }) {
    // reference to satisfy no-unused-vars rule
    void _userId;
    const tasks = await this.tasksRepo.find({
      where: { task_id: In(taskIds), tenant_id: tenantId },
    });

    if (tasks.length === 0) return { deleted: 0 };

    await this.tasksRepo.remove(tasks);
    return { deleted: tasks.length };
  }
}
