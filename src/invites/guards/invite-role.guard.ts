import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../../entities/workspace_member.entity';
import { JwtPayload } from '../../auth/jwt.strategy';
import { Invite } from '../../entities/invite.entity';

@Injectable()
export class InviteRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(WorkspaceMember)
    private readonly membersRepo: Repository<WorkspaceMember>,
    @InjectRepository(Invite)
    private readonly invitesRepo: Repository<Invite>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: JwtPayload;
      params: { id?: string };
    }>();
    const { user, params } = request;
    const { tenantId, sub: userId } = user;
    const inviteId = params.id;

    if (!inviteId) {
      return false;
    }

    const invite = await this.invitesRepo.findOne({
      where: { invite_id: inviteId, tenant_id: tenantId },
    });

    if (!invite) {
      return false; // Or throw NotFoundException
    }

    const workspaceId = invite.resource_id;

    const member = await this.membersRepo.findOne({
      where: {
        tenant_id: tenantId,
        workspace_id: workspaceId,
        user_id: userId,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }

    const hasRole = () => requiredRoles.includes(member.role);

    if (member && hasRole()) {
      return true;
    }

    throw new ForbiddenException(
      'You do not have the required role for this action.',
    );
  }
}
