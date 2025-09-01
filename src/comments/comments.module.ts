import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { SharedModule } from '../shared/shared.module';
import { EntitiesModule } from '../entities/entities.module';

@Module({
  imports: [SharedModule, EntitiesModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
