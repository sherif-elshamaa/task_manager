import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entity';
import * as AWS from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

export interface BackupMetadata {
  id: string;
  tenant_id: string;
  type: 'full' | 'incremental';
  status: 'pending' | 'running' | 'completed' | 'failed';
  size_bytes: number;
  created_at: Date;
  completed_at?: Date;
  s3_key: string;
  retention_until: Date;
  checksum: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3Client: AWS.S3;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {
    this.s3Client = new AWS.S3({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performScheduledBackups() {
    this.logger.log('Starting scheduled backup process');

    try {
      const tenants = await this.tenantsRepo.find({
        where: { status: 'active' },
      });

      for (const tenant of tenants) {
        await this.createTenantBackup(tenant.tenant_id, 'full');
      }

      this.logger.log(
        `Completed scheduled backups for ${tenants.length} tenants`,
      );
    } catch (error) {
      this.logger.error('Scheduled backup failed:', error);
    }
  }

  async createTenantBackup(
    tenantId: string,
    type: 'full' | 'incremental' = 'full',
  ): Promise<BackupMetadata> {
    const backupId = `backup_${tenantId}_${Date.now()}`;
    const s3Key = `backups/${tenantId}/${backupId}.sql.gz`;

    this.logger.log(`Starting ${type} backup for tenant ${tenantId}`);

    const metadata: BackupMetadata = {
      id: backupId,
      tenant_id: tenantId,
      type,
      status: 'pending',
      size_bytes: 0,
      created_at: new Date(),
      s3_key: s3Key,
      retention_until: this.calculateRetentionDate(),
      checksum: '',
    };

    try {
      metadata.status = 'running';

      // Generate database dump
      const dumpData = this.generateDatabaseDump(tenantId, type);

      // Compress and upload to S3
      const compressedData = this.compressData(dumpData);
      metadata.size_bytes = compressedData.length;
      metadata.checksum = this.calculateChecksum(compressedData);

      await this.uploadToS3(s3Key, compressedData);

      metadata.status = 'completed';
      metadata.completed_at = new Date();

      // Store metadata (in a real implementation, you'd store this in a database)
      await this.storeBackupMetadata(metadata);

      this.logger.log(`Backup completed for tenant ${tenantId}: ${backupId}`);
      return metadata;
    } catch (error) {
      metadata.status = 'failed';
      this.logger.error(`Backup failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async restoreTenantBackup(tenantId: string, backupId: string): Promise<void> {
    this.logger.log(
      `Starting restore for tenant ${tenantId} from backup ${backupId}`,
    );

    try {
      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error(`Backup ${backupId} not found`);
      }

      if (metadata.tenant_id !== tenantId) {
        throw new Error(
          `Backup ${backupId} does not belong to tenant ${tenantId}`,
        );
      }

      // Download from S3
      const compressedData = await this.downloadFromS3(metadata.s3_key);

      // Verify checksum
      const checksum = this.calculateChecksum(compressedData);
      if (checksum !== metadata.checksum) {
        throw new Error('Backup data integrity check failed');
      }

      // Decompress
      const dumpData = this.decompressData(compressedData);

      // Restore database
      await this.restoreDatabase(tenantId, dumpData);

      this.logger.log(
        `Restore completed for tenant ${tenantId} from backup ${backupId}`,
      );
    } catch (error) {
      this.logger.error(`Restore failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  listTenantBackups(_tenantId: string): BackupMetadata[] {
    // mark param as used for lint
    void _tenantId;
    // In a real implementation, query from database
    // For now, return mock data
    return [];
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredBackups() {
    this.logger.log('Starting backup cleanup process');

    try {
      const expiredBackups = await this.getExpiredBackups();

      for (const backup of expiredBackups) {
        await this.deleteBackup(backup.id);
      }

      this.logger.log(`Cleaned up ${expiredBackups.length} expired backups`);
    } catch (error) {
      this.logger.error('Backup cleanup failed:', error);
    }
  }

  private generateDatabaseDump(
    tenantId: string,
    type: 'full' | 'incremental',
  ): string {
    // In a real implementation, this would:
    // 1. Use pg_dump for PostgreSQL
    // 2. Filter data by tenant_id
    // 3. Handle incremental backups based on timestamps
    // 4. Include schema and data

    return `-- Mock database dump for tenant ${tenantId} (${type})
-- Generated at ${new Date().toISOString()}
-- This would contain actual SQL dump data in production`;
  }

  private compressData(data: string): Buffer {
    // In a real implementation, use gzip compression
    return Buffer.from(data, 'utf8');
  }

  private decompressData(data: Buffer): string {
    // In a real implementation, use gzip decompression
    return data.toString('utf8');
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async uploadToS3(key: string, data: Buffer): Promise<void> {
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET');

    await this.s3Client.putObject({
      Bucket: bucket,
      Key: key,
      Body: data,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA', // Infrequent Access for cost optimization
    });
  }

  private async downloadFromS3(key: string): Promise<Buffer> {
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET');

    const response = await this.s3Client.getObject({
      Bucket: bucket,
      Key: key,
    });

    if (!response.Body) {
      throw new Error('Failed to download backup from S3');
    }

    return Buffer.from(await response.Body.transformToByteArray());
  }

  private async deleteBackup(backupId: string): Promise<void> {
    const metadata = await this.getBackupMetadata(backupId);
    if (!metadata) return;

    // Delete from S3
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET')!;
    await this.s3Client.deleteObject({
      Bucket: bucket,
      Key: metadata.s3_key,
    });

    // Delete metadata
    await this.deleteBackupMetadata(backupId);
  }

  private calculateRetentionDate(): Date {
    const retentionDays = this.configService.get<number>(
      'BACKUP_RETENTION_DAYS',
      30,
    );
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + retentionDays);
    return retentionDate;
  }

  private async restoreDatabase(
    tenantId: string,
    dumpData: string,
  ): Promise<void> {
    // In a real implementation, this would:
    // 1. Create a transaction
    // 2. Drop existing tenant data
    // 3. Execute the SQL dump
    // 4. Verify data integrity
    // 5. Commit or rollback

    void dumpData;
    this.logger.log(`Restoring database for tenant ${tenantId}`);
    // Mock implementation
    await Promise.resolve();
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    // In a real implementation, store in database
    this.logger.log(`Storing backup metadata: ${metadata.id}`);
    await Promise.resolve();
  }

  private async getBackupMetadata(
    backupId: string,
  ): Promise<BackupMetadata | null> {
    // In a real implementation, query from database
    void backupId;
    await Promise.resolve();
    return null;
  }

  private async deleteBackupMetadata(backupId: string): Promise<void> {
    // In a real implementation, delete from database
    this.logger.log(`Deleting backup metadata: ${backupId}`);
    await Promise.resolve();
  }

  private async getExpiredBackups(): Promise<BackupMetadata[]> {
    // In a real implementation, query expired backups from database
    await Promise.resolve();
    return [];
  }
}
