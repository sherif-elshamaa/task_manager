import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupService, BackupMetadata } from './backup.service';
import { Tenant } from '../../entities/tenant.entity';
import * as AWS from '@aws-sdk/client-s3';

// Mock @nestjs/schedule to satisfy Cron imports in the service during unit tests
jest.mock(
  '@nestjs/schedule',
  () => ({
    Cron:
      () =>
      (
        _target?: any,
        _propertyKey?: string,
        _descriptor?: PropertyDescriptor,
      ) => {
        /* no-op */
      },
    CronExpression: {},
  }),
  { virtual: true },
);

// We'll mock the S3 client from @aws-sdk/client-s3 (v3)
jest.mock('@aws-sdk/client-s3');

describe('BackupService', () => {
  let service: BackupService;
  let configService: ConfigService;
  let tenantsRepo: jest.Mocked<Repository<Tenant>>;
  let mockS3: jest.Mocked<AWS.S3>;

  const mockConfigService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;

  const mockTenantsRepo: Partial<jest.Mocked<Repository<Tenant>>> = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    // Reset S3 mock with v3-style methods
    mockS3 = {
      putObject: jest.fn().mockResolvedValue({}),
      getObject: jest.fn().mockResolvedValue({
        Body: {
          transformToByteArray: jest
            .fn()
            .mockResolvedValue(Buffer.from('-- SQL backup content')),
        },
      } as any),
      deleteObject: jest.fn().mockResolvedValue({}),
    } as any;

    (AWS.S3 as unknown as jest.MockedClass<typeof AWS.S3>).mockImplementation(
      () => mockS3,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantsRepo },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    configService = module.get<ConfigService>(ConfigService);
    tenantsRepo = module.get(getRepositoryToken(Tenant));

    // Setup default config values
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      const config: Record<string, any> = {
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_REGION: 'us-east-1',
        BACKUP_S3_BUCKET: 'test-backup-bucket',
        BACKUP_RETENTION_DAYS: 30,
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTenantBackup', () => {
    it('should create and upload a backup for a tenant', async () => {
      const result = await service.createTenantBackup('t1', 'full');

      expect(result).toMatchObject({
        tenant_id: 't1',
        type: 'full',
        status: 'completed',
        s3_key: expect.stringContaining('backups/t1/'),
        created_at: expect.any(Date),
        retention_until: expect.any(Date),
        checksum: expect.any(String),
      } as Partial<BackupMetadata>);

      expect(mockS3.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-backup-bucket',
          Key: expect.stringContaining('backups/t1/'),
          Body: expect.any(Buffer),
        }),
      );
    });

    it('should propagate errors from uploadToS3', async () => {
      (mockS3.putObject as jest.Mock).mockRejectedValueOnce(
        new Error('S3 put failed'),
      );
      await expect(service.createTenantBackup('t1')).rejects.toThrow(
        'S3 put failed',
      );
    });
  });

  describe('restoreTenantBackup', () => {
    it('should throw on integrity check failure', async () => {
      jest
        .spyOn<any, any>(service as any, 'getBackupMetadata')
        .mockResolvedValue({
          id: 'b1',
          tenant_id: 't1',
          type: 'full',
          status: 'completed',
          size_bytes: 10,
          created_at: new Date(),
          s3_key: 'backups/t1/b1.sql.gz',
          retention_until: new Date(),
          checksum: 'expected',
        } as BackupMetadata);

      jest
        .spyOn<any, any>(service as any, 'calculateChecksum')
        .mockResolvedValue('different');
      await expect(service.restoreTenantBackup('t1', 'b1')).rejects.toThrow(
        'Backup data integrity check failed',
      );
    });
  });

  describe('performScheduledBackups', () => {
    it('should run backups for active tenants', async () => {
      (mockTenantsRepo.find as jest.Mock).mockResolvedValue([
        { tenant_id: 't1', status: 'active' } as any,
      ]);
      const spy = jest.spyOn(service, 'createTenantBackup');
      await service.performScheduledBackups();
      expect(spy).toHaveBeenCalledWith('t1', 'full');
    });
  });

  describe('cleanupExpiredBackups', () => {
    it('should delete expired backups', async () => {
      jest
        .spyOn<any, any>(service as any, 'getExpiredBackups')
        .mockResolvedValue([
          { id: 'b1', tenant_id: 't1', s3_key: 'backups/t1/b1.sql.gz' } as any,
        ]);
      jest
        .spyOn<any, any>(service as any, 'getBackupMetadata')
        .mockResolvedValue({
          id: 'b1',
          tenant_id: 't1',
          s3_key: 'backups/t1/b1.sql.gz',
          checksum: '',
          size_bytes: 0,
          status: 'completed',
          created_at: new Date(),
          retention_until: new Date(),
          type: 'full',
        } as any);
      const delMetaSpy = jest
        .spyOn<any, any>(service as any, 'deleteBackupMetadata')
        .mockResolvedValue(undefined);

      await service.cleanupExpiredBackups();
      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-backup-bucket',
        Key: 'backups/t1/b1.sql.gz',
      });
      expect(delMetaSpy).toHaveBeenCalledWith('b1');
    });
  });

  // Deprecated APIs from earlier design are intentionally not tested here.

  // No getBackupStatus in current service; omitted.

  describe('scheduled backups', () => {
    it('should call createTenantBackup for each active tenant', async () => {
      (mockTenantsRepo.find as jest.Mock).mockResolvedValue([
        { tenant_id: 't1', status: 'active' } as any,
        { tenant_id: 't2', status: 'active' } as any,
      ]);
      const spy = jest.spyOn(service, 'createTenantBackup');
      await service.performScheduledBackups();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 't1', 'full');
      expect(spy).toHaveBeenNthCalledWith(2, 't2', 'full');
    });
  });
});
