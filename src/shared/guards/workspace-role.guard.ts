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

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(WorkspaceMember)
    private readonly membersRepo: Repository<WorkspaceMember>,
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
      params: { id?: string; workspaceId?: string };
      body: { resourceId?: string; workspaceId?: string };
    }>();
    const { user, params, body } = request;
    const { tenantId, sub: userId } = user;

    const workspaceId =
      params.id || params.workspaceId || body.resourceId || body.workspaceId;

    if (!workspaceId) {
      // Should be caught by WorkspaceMemberGuard first
      return false;
    }

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

    const roleHierarchy = {
      owner: ['owner', 'admin', 'member'],
      admin: ['admin', 'member'],
      member: ['member'],
    };

    const userPermissions =
      roleHierarchy[member.role as keyof typeof roleHierarchy] || [];
    const hasRole = () =>
      requiredRoles.some((role) => userPermissions.includes(role));

    if (member && hasRole()) {
      return true;
    }

    throw new ForbiddenException(
      'You do not have the required role for this action.',
    );
  }
}
