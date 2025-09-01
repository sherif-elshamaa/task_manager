import { Module } from '@nestjs/common';
import { SentryService } from './sentry.service';
import { TracingModule } from '../tracing/tracing.module';

@Module({
  imports: [TracingModule],
  providers: [SentryService],
  exports: [SentryService],
})
export class ErrorTrackingModule {}
