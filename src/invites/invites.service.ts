import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invite } from '../entities/invite.entity';
import { WorkspaceMember } from '../entities/workspace_member.entity';
// import { ProjectMember } from '../entities/project_member.entity';
import { UpdateInviteDto, ListInvitesQueryDto } from './dto';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type { Tracer } from '@opentelemetry/api';

@Injectable()
export class InvitesService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(Invite)
    private readonly invitesRepo: Repository<Invite>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMembersRepo: Repository<WorkspaceMember>,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async create({
    tenantId,
    userId,
    email,
    workspaceId,
    role,
  }: {
    tenantId: string;
    userId: string;
    email: string;
    workspaceId: string;
    role: 'admin' | 'member';
  }): Promise<Invite> {
    return this.tracer.startActiveSpan(
      'InvitesService.create',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'user.id': userId,
          'invite.email': email,
          'resource.type': 'workspace',
          'resource.id': workspaceId,
        });

        const invite = this.invitesRepo.create({
          tenant_id: tenantId,
          invited_by: userId,
          email: email,
          resource_type: 'workspace',
          resource_id: workspaceId,
          role: role,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        });
        const savedInvite = await this.invitesRepo.save(invite);

        await this.emailQueue.add('send-invite-email', {
          to: savedInvite.email,
          inviteId: savedInvite.invite_id,
          tenantId: savedInvite.tenant_id,
        });

        span.setAttribute('invite.id', savedInvite.invite_id);
        span.end();
        return savedInvite;
      },
    );
  }

  async findAll({
    tenantId,
    query,
  }: {
    tenantId: string;
    query: ListInvitesQueryDto;
  }) {
    const offset = typeof query.offset === 'number' ? query.offset : 0;
    const limit = typeof query.limit === 'number' ? query.limit : 10;
    const [invites, total] = await this.invitesRepo.findAndCount({
      where: { tenant_id: tenantId },
      skip: offset,
      take: limit,
    });
    return {
      invites,
      total,
      offset,
      limit,
    };
  }

  async findOne({ tenantId, id }: { tenantId: string; id: string }) {
    return this.tracer.startActiveSpan(
      'InvitesService.findOne',
      async (span) => {
        span.setAttributes({ 'tenant.id': tenantId, 'invite.id': id });
        const invite = await this.invitesRepo.findOne({
          where: { invite_id: id, tenant_id: tenantId },
        });

        if (!invite) {
          throw new NotFoundException(`Invite with ID ${id} not found`);
        }

        span.end();
        return invite;
      },
    );
  }

  async update({
    tenantId,
    userId: _userId,
    id,
    dto,
  }: {
    tenantId: string;
    userId: string;
    id: string;
    dto: UpdateInviteDto;
  }) {
    return this.tracer.startActiveSpan(
      'InvitesService.update',
      async (span) => {
        span.setAttributes({ 'tenant.id': tenantId, 'invite.id': id });
        void _userId;
        const invite = await this.findOne({ tenantId, id });

        if (dto.status !== undefined) invite.status = dto.status;
        if (dto.role !== undefined) invite.role = dto.role;
        const savedInvite = await this.invitesRepo.save(invite);
        span.end();
        return savedInvite;
      },
    );
  }

  async remove({
    tenantId,
    userId: _userId,
    id,
  }: {
    tenantId: string;
    userId: string;
    id: string;
  }): Promise<void> {
    return this.tracer.startActiveSpan(
      'InvitesService.remove',
      async (span) => {
        span.setAttributes({ 'tenant.id': tenantId, 'invite.id': id });
        void _userId;
        const invite = await this.findOne({ tenantId, id });
        await this.invitesRepo.remove(invite);
        span.end();
      },
    );
  }

  async accept({
    tenantId,
    userId,
    email,
    id,
  }: {
    tenantId: string;
    userId: string;
    email: string;
    id: string;
  }) {
    return this.tracer.startActiveSpan(
      'InvitesService.accept',
      async (span) => {
        span.setAttributes({
          'tenant.id': tenantId,
          'invite.id': id,
          'user.id': userId,
        });
        const invite = await this.findOne({ tenantId, id });

        if (invite.email !== email) {
          throw new ForbiddenException(
            'You are not authorized to accept this invite.',
          );
        }

        if (invite.status !== 'pending') {
          throw new NotFoundException(`Invite with ID ${id} is not pending`);
        }

        // Add user to the resource based on type
        if (invite.resource_type === 'workspace') {
          await this.workspaceMembersRepo.save({
            workspace_id: invite.resource_id,
            user_id: userId,
            role: invite.role,
            tenant_id: tenantId,
          });
        }

        // Mark invite as accepted
        invite.status = 'accepted';
        invite.accepted_at = new Date();
        await this.invitesRepo.save(invite);

        span.end();
        return { accepted: true };
      },
    );
  }

  async decline({
    tenantId,
    userId: _userId,
    email,
    id,
  }: {
    tenantId: string;
    userId: string;
    email: string;
    id: string;
  }) {
    return this.tracer.startActiveSpan(
      'InvitesService.decline',
      async (span) => {
        span.setAttributes({ 'tenant.id': tenantId, 'invite.id': id });
        void _userId;
        const invite = await this.findOne({ tenantId, id });

        if (invite.email !== email) {
          throw new ForbiddenException(
            'You are not authorized to decline this invite.',
          );
        }

        if (invite.status !== 'pending') {
          throw new NotFoundException(`Invite with ID ${id} is not pending`);
        }

        invite.status = 'declined';
        invite.declined_at = new Date();
        await this.invitesRepo.save(invite);

        span.end();
        return { declined: true };
      },
    );
  }
}
