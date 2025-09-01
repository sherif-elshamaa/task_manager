import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailProcessor } from './email.processor';
import { NotificationProcessor } from './notification.processor';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionJob } from './retention.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue(
      {
        name: 'email',
      },
      {
        name: 'notifications',
      },
    ),
  ],
  providers: [EmailProcessor, NotificationProcessor, RetentionJob],
  exports: [BullModule, ScheduleModule, RetentionJob],
})
export class JobsModule {}
