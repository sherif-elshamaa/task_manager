import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Project } from '../entities/project.entity';
import { Comment } from '../entities/comment.entity';
import { ActivityLog } from '../entities/activity_log.entity';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Task,
      Project,
      Comment,
      ActivityLog,
    ]),
    SharedModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
