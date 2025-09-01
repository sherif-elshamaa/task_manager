import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { S3Service } from '../shared/services/s3.service';
import { AntivirusService } from '../shared/services/antivirus.service';
import { TasksModule } from '../tasks/tasks.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TasksModule, SharedModule],
  controllers: [FilesController],
  providers: [S3Service, AntivirusService],
})
export class FilesModule {}
