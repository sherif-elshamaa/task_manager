import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class RetentionJob {
  private readonly logger = new Logger(RetentionJob.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // Run daily at 03:00
  @Cron('0 3 * * *')
  async handleRetention(): Promise<void> {
    const disableDb = this.config.get<string>('DISABLE_DB') === 'true';
    if (disableDb) {
      this.logger.log('Retention enforcement skipped: DB disabled');
      return;
    }

    const retentionDays = Number(
      this.config.get<string>('RETENTION_DAYS') ?? '90',
    );
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
      this.logger.warn(
        `Invalid RETENTION_DAYS value; skipping retention. Value: ${String(
          this.config.get('RETENTION_DAYS'),
        )}`,
      );
      return;
    }

    try {
      // Postgres DELETE older than retentionDays
      // Note: ensure table/column names match your schema
      await this.dataSource.query(
        `DELETE FROM activity_logs WHERE created_at < NOW() - ($1 || ' days')::interval`,
        [retentionDays.toString()],
      );
      this.logger.log(
        `Retention enforcement completed for activity_logs (> ${retentionDays} days).`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Retention enforcement failed: ${message}`);
    }
  }
}
