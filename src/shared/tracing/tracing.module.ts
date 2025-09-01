import { Module } from '@nestjs/common';
import { TracingService } from './tracing.service';

const tracerProvider = {
  provide: 'TRACER',
  useFactory: (tracingService: TracingService) => {
    return tracingService.tracer;
  },
  inject: [TracingService],
};

@Module({
  providers: [TracingService, tracerProvider],
  exports: [TracingService, tracerProvider],
})
export class TracingModule {}
