import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../../entities/workspace_member.entity';

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  body: {
    workspace_id?: string;
  };
  params: {
    workspaceId?: string;
  };
  query: {
    workspace_id?: string;
  };
}

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly membersRepo: Repository<WorkspaceMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedRequest = context.switchToHttp().getRequest();
    const user = request.user;
    const req = request as any;
    const workspaceId =
      req.params?.id ||
      req.body?.workspace_id ||
      req.params?.workspace_id ||
      req.query?.workspace_id ||
      req.body?.workspaceId ||
      req.params?.workspaceId ||
      req.query?.workspaceId;

    if (!user || !workspaceId) {
      return false;
    }

    const member = await this.membersRepo.findOne({
      where: {
        tenant_id: user.tenantId,
        workspace_id: workspaceId,
        user_id: user.sub,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }

    return true;
  }
}
