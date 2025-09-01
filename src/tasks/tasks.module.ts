import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { SharedModule } from '../shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { Project } from '../entities/project.entity';
import { Comment } from '../entities/comment.entity';
import { JobsModule } from '../jobs/jobs.module';
import { TracingModule } from '../shared/tracing/tracing.module';

@Module({
  imports: [
    SharedModule,
    JobsModule,
    TracingModule,
    TypeOrmModule.forFeature([Task, Project, Comment]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
