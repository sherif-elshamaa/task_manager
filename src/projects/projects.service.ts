import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Tracer } from '@opentelemetry/api';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Like, FindOptionsWhere } from 'typeorm';
import { findAndCountByTenant } from '../shared/tenant/tenant-scope';
import { Project } from '../entities/project.entity';
import { Tenant } from '../entities/tenant.entity';
import { PrometheusService } from '../shared/monitoring/prometheus.service';
import { PinoLogger } from 'nestjs-pino';

import { CreateProjectDto } from './dto';

export interface CreateProjectInput {
  tenantId: string;
  userId: string;
  workspaceId: string;
  dto: CreateProjectDto;
}

export interface ListProjectsInput {
  tenantId: string;
  q?: string;
  page: number;
  limit: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    private readonly prometheusService: PrometheusService,
    private readonly logger: PinoLogger,
  ) {}

  async create(input: CreateProjectInput) {
    return this.tracer.startActiveSpan(
      'ProjectsService.create',
      async (span) => {
        const { tenantId, userId, workspaceId, dto } = input;
        span.setAttributes({
          'tenant.id': tenantId,
          'user.id': userId,
          'workspace.id': workspaceId,
        });

        const tenant = new Tenant();
        tenant.tenant_id = tenantId;

        const { workspace_id: _workspace_id, ...rest } = dto;

        const project = this.projectsRepo.create({
          ...rest,
          workspace_id: workspaceId,
          created_by: userId,
          tenant: tenant,
        });

        try {
          const saved = await this.projectsRepo.save(project);
          this.prometheusService.recordProjectCreated(
            tenantId,
            saved.workspace_id ?? undefined,
          );
          span.setAttribute('project.id', saved.project_id);
          span.end();
          return saved;
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          this.logger.error(
            { error: error.message, tenantId, userId },
            'Failed to save project',
          );
          span.setAttribute('error', error.message);
          span.end();
          throw error;
        }
      },
    );
  }

  async update({
    tenantId,
    id,
    dto,
  }: {
    tenantId: string;
    id: string;
    dto: Partial<{
      name: string;
      description: string | null;
      workspaceId: string | null;
      visibility: 'private' | 'workspace' | 'tenant';
    }>;
  }) {
    return this.tracer.startActiveSpan(
      'ProjectsService.update',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'project.id': id,
        });

        const project = await this.findOne({ tenantId, id });
        if (!project) {
          span.end();
          return null;
        }

        if (dto.name !== undefined) {
          project.name = dto.name;
        }
        if (dto.description !== undefined) {
          project.description = dto.description;
        }
        if (dto.workspaceId !== undefined) {
          project.workspace_id = dto.workspaceId;
        }
        if (dto.visibility !== undefined) {
          project.visibility = dto.visibility;
        }

        const updatedProject = await this.projectsRepo.save(project);
        span.end();
        return updatedProject;
      },
    );
  }

  async list({
    tenantId,
    page,
    limit,
    search,
  }: {
    tenantId: string;
    page: number;
    limit: number;
    search?: string;
  }) {
    const offset = (page - 1) * limit;
    const where: FindOptionsWhere<Project> = {};
    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (tenantId === 'all') {
      const [projects, total] = await this.projectsRepo.findAndCount({
        where,
        skip: offset,
        take: limit,
        order: { created_at: 'DESC' },
      });
      return { projects, total, page, limit };
    }

    const [projects, total] = await findAndCountByTenant(
      this.projectsRepo,
      tenantId,
      {
        where,
        skip: offset,
        take: limit,
        order: { created_at: 'DESC' },
      },
      'tenant.tenant_id',
    );
    return { projects, total, page, limit };
  }

  async findAll({
    tenantId,
    query,
  }: {
    tenantId: string;
    query: {
      offset?: number | string;
      limit?: number | string;
      page?: number | string;
      search?: string;
    };
  }) {
    const take = Number(query.limit ?? 10) || 10;
    const pageNum = query.page !== undefined ? Number(query.page) : undefined;
    const offset =
      pageNum && !Number.isNaN(pageNum) && pageNum > 0
        ? (pageNum - 1) * take
        : Number(query.offset ?? 0) || 0;
    const where: FindOptionsWhere<Project> = {};
    if (query.search) {
      where.name = Like(`%${query.search}%`);
    }

    const [projects, total] = await findAndCountByTenant(
      this.projectsRepo,
      tenantId,
      {
        where,
        skip: offset,
        take,
        order: { created_at: 'DESC' },
      },
      'tenant.tenant_id',
    );
    return {
      items: projects,
      total,
      page: pageNum ?? 1,
      limit: take,
    };
  }

  async findOne({ tenantId, id }: { tenantId: string; id: string }) {
    return this.tracer.startActiveSpan(
      'ProjectsService.findOne',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'project.id': id,
        });

        const project = await this.projectsRepo.findOne({
          where: { project_id: id, tenant: { tenant_id: tenantId } },
        });

        if (!project) {
          throw new NotFoundException(`Project with ID ${id} not found`);
        }

        span.end();
        return project;
      },
    );
  }

  async remove({ tenantId, id }: { tenantId: string; id: string }) {
    const project = await this.findOne({ tenantId, id });
    await this.projectsRepo.remove(project);
    return { deleted: true };
  }

  async bulkUpdate({
    tenantId,
    projectIds,
    updates,
  }: {
    tenantId: string;
    projectIds: string[];
    updates: Partial<{
      name: string;
      description: string | null;
      workspace_id: string | null;
      visibility: 'private' | 'workspace' | 'tenant';
    }>;
  }) {
    const projects = await this.projectsRepo.find({
      where: { project_id: In(projectIds), tenant: { tenant_id: tenantId } },
    });

    if (projects.length === 0) return { updated: 0 };

    const updatedProjects = projects.map((project) => {
      if (updates.name !== undefined) project.name = updates.name;
      if (updates.description !== undefined)
        project.description = updates.description;
      if (updates.workspace_id !== undefined)
        project.workspace_id = updates.workspace_id;
      if (updates.visibility !== undefined)
        project.visibility = updates.visibility;
      return project;
    });

    const saved = await this.projectsRepo.save(updatedProjects);
    return { updated: saved.length, projects: saved };
  }

  async bulkDelete({
    tenantId,
    projectIds,
  }: {
    tenantId: string;
    projectIds: string[];
  }) {
    const projects = await this.projectsRepo.find({
      where: { project_id: In(projectIds), tenant: { tenant_id: tenantId } },
    });

    if (projects.length === 0) return { deleted: 0 };

    await this.projectsRepo.remove(projects);
    return { deleted: projects.length };
  }
}
