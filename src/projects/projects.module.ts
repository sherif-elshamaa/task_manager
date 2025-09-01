import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SharedModule } from '../shared/shared.module';
import { EntitiesModule } from '../entities/entities.module';
import { TracingModule } from '../shared/tracing/tracing.module';

@Module({
  imports: [SharedModule, EntitiesModule, TracingModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
