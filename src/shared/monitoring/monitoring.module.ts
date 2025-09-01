import { Module } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  providers: [PrometheusService],
  controllers: [MonitoringController],
  exports: [PrometheusService],
})
export class MonitoringModule {}
