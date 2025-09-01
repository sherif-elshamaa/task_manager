import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { Comment } from './comment.entity';
import { WorkspaceMember } from './workspace_member.entity';
import { RefreshToken } from './refresh_token.entity';
import { ActivityLog } from './activity_log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Workspace,
      WorkspaceMember,
      Project,
      Task,
      Comment,
      RefreshToken,
      ActivityLog,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class EntitiesModule {}
