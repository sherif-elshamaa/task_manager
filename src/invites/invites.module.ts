import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InviteRoleGuard } from './guards/invite-role.guard';
import { Invite } from '../entities/invite.entity';
import { WorkspaceMember } from '../entities/workspace_member.entity';
// ProjectMember entity not present yet; remove until implemented
import { SharedModule } from '../shared/shared.module';
import { TracingModule } from '../shared/tracing/tracing.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, WorkspaceMember]),
    SharedModule,
    TracingModule,
    JobsModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService, InviteRoleGuard],
  exports: [InvitesService],
})
export class InvitesModule {}
