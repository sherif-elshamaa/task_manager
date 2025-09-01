import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, ILike, Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace_member.entity';
import { AddMemberDto, CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import type { Tracer } from '@opentelemetry/api';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspacesRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly membersRepo: Repository<WorkspaceMember>,
    @Inject('TRACER') private readonly tracer: Tracer,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create({
    tenantId,
    userId,
    dto,
  }: {
    tenantId: string;
    userId: string;
    dto: CreateWorkspaceDto;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.create',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'user.id': userId,
          'workspace.name': dto.name,
        });

        const saved = await this.workspacesRepo.save({
          tenant_id: tenantId,
          name: dto.name,
          description: dto.description,
          created_by: userId,
        });
        span.setAttribute('workspace.id', saved.workspace_id);

        // Add creator as owner member
        await this.membersRepo.save({
          tenant_id: tenantId,
          workspace_id: saved.workspace_id,
          user_id: userId,
          role: 'owner',
        });

        span.end();
        return saved;
      },
    );
  }

  async findAll({
    tenantId,
    query,
  }: {
    tenantId: string;
    query: { page?: number; limit?: number; search?: string };
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.findAll',
      async (span) => {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        span.setAttributes({
          'tenant.id': tenantId,
          'page.number': page,
          'page.limit': limit,
          'search.term': query.search ?? '',
        });
        const where = query.search
          ? { tenant_id: tenantId, name: ILike(`%${query.search}%`) }
          : { tenant_id: tenantId };
        const [items, total] = await this.workspacesRepo.findAndCount({
          where,
          skip: (page - 1) * limit,
          take: limit,
          order: { created_at: 'DESC' },
        });
        span.end();
        return { items, total, page, limit };
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
    return this.tracer.startActiveSpan(
      'WorkspacesService.list',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'page.number': page,
          'page.limit': limit,
          'search.term': search ?? '',
        });
        const where = search
          ? { tenant_id: tenantId, name: ILike(`%${search}%`) }
          : { tenant_id: tenantId };
        const [items, total] = await this.workspacesRepo.findAndCount({
          where,
          skip: (page - 1) * limit,
          take: limit,
          order: { created_at: 'DESC' },
        });
        span.end();
        return { items, total, page, limit };
      },
    );
  }

  async findOne({
    tenantId,
    workspaceId,
    id,
  }: {
    tenantId: string;
    workspaceId?: string;
    id?: string;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.findOne',
      async (span) => {
        const key = workspaceId ?? id!;
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': key,
        });

        const ws = await this.workspacesRepo.findOne({
          where: { workspace_id: key, tenant_id: tenantId },
        });

        span.end();
        return ws ?? null;
      },
    );
  }

  async update({
    tenantId,
    userId: _userId,
    workspaceId,
    id,
    dto,
  }: {
    tenantId: string;
    userId: string;
    workspaceId?: string;
    id?: string;
    dto: UpdateWorkspaceDto;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.update',
      async (span) => {
        void _userId;
        const key = workspaceId ?? id!;
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': key,
        });

        await this.workspacesRepo.update(
          { workspace_id: key, tenant_id: tenantId },
          dto,
        );
        const result = await this.workspacesRepo.findOne({
          where: { workspace_id: key, tenant_id: tenantId },
        });

        span.end();
        return result;
      },
    );
  }

  async remove({
    tenantId,
    userId: _userId,
    workspaceId,
    id,
  }: {
    tenantId: string;
    userId: string;
    workspaceId?: string;
    id?: string;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.remove',
      async (span) => {
        void _userId;
        const key = workspaceId ?? id!;
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': key,
        });

        await this.cacheManager.del(`/v1/workspaces/${key}`);

        await this.workspacesRepo.manager.transaction(
          async (transactionalEntityManager) => {
            await transactionalEntityManager.delete(WorkspaceMember, {
              workspace_id: key,
            });
            await transactionalEntityManager.delete(Workspace, {
              workspace_id: key,
              tenant_id: tenantId,
            });
          },
        );

        span.end();
        return { deleted: true };
      },
    );
  }

  async addMember({
    tenantId,
    userId: _userId,
    workspaceId,
    dto,
  }: {
    tenantId: string;
    userId: string;
    workspaceId: string;
    dto: AddMemberDto;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.addMember',
      async (span) => {
        void _userId;
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': workspaceId,
          'member.id': dto.userId,
        });

        const member = this.membersRepo.create({
          workspace_id: workspaceId,
          user_id: dto.userId,
          tenant_id: tenantId,
          role: dto.role || 'member',
        } as DeepPartial<WorkspaceMember>);
        const savedMember = await this.membersRepo.save(member);

        span.end();
        return savedMember;
      },
    );
  }

  async removeMember({
    tenantId: _tenantId,
    userId: _userId,
    workspaceId,
    memberId,
  }: {
    tenantId: string;
    userId: string;
    workspaceId: string;
    memberId: string;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.removeMember',
      async (span) => {
        void _tenantId;
        void _userId;
        span.setAttributes({
          'workspace.id': workspaceId,
          'member.id': memberId,
        });

        const member = await this.membersRepo.findOne({
          where: {
            workspace_id: workspaceId,
            user_id: memberId,
          },
        });
        if (!member) {
          span.end();
          return null;
        }

        await this.membersRepo.remove(member);

        span.end();
        return { removed: true };
      },
    );
  }

  async archive({
    tenantId,
    userId: _userId,
    workspaceId,
  }: {
    tenantId: string;
    userId: string;
    workspaceId: string;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.archive',
      async (span) => {
        void _userId;
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': workspaceId,
        });

        await this.workspacesRepo.update(
          { workspace_id: workspaceId, tenant_id: tenantId },
          { is_archived: true },
        );
        const result = await this.workspacesRepo.findOne({
          where: { workspace_id: workspaceId, tenant_id: tenantId },
        });

        span.end();
        return result;
      },
    );
  }

  async unarchive({
    tenantId,
    userId: _userId,
    workspaceId,
  }: {
    tenantId: string;
    userId: string;
    workspaceId: string;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.unarchive',
      async (span) => {
        void _userId;
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': workspaceId,
        });

        await this.workspacesRepo.update(
          { workspace_id: workspaceId, tenant_id: tenantId },
          { is_archived: false },
        );
        const result = await this.workspacesRepo.findOne({
          where: { workspace_id: workspaceId, tenant_id: tenantId },
        });

        span.end();
        return result;
      },
    );
  }

  async findAllMembers({
    tenantId,
    workspaceId,
  }: {
    tenantId: string;
    workspaceId: string;
  }) {
    return this.tracer.startActiveSpan(
      'WorkspacesService.findAllMembers',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'workspace.id': workspaceId,
        });

        const members = await this.membersRepo.find({
          where: {
            workspace_id: workspaceId,
            tenant_id: tenantId,
          },
        });

        span.end();
        return {
          items: members.map((m) => ({
            user_id: m.user_id,
            role: m.role,
          })),
        };
      },
    );
  }
}
