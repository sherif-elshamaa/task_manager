import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity_log.entity';
import { ActivityLogsService } from './activity-logs.service';
import { TracingModule } from '../shared/tracing/tracing.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog]), TracingModule],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
