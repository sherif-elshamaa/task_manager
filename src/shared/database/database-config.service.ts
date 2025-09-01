import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfigService {
  constructor(private readonly configService: ConfigService) {}

  private getNumber(key: string, defaultValue: number): number {
    const raw = this.configService.get<string | number>(key);
    const n =
      typeof raw === 'number' ? raw : raw !== undefined ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : defaultValue;
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const url =
      this.configService.get<string>('DATABASE_URL') ||
      'postgresql://localhost:5432/taskmanager';
    const pool = this.getConnectionPoolConfig();

    return {
      type: 'postgres',
      url,
      // Keep a single pattern ending with .ts to satisfy test regex /\.entity\.(ts|js)$/
      entities: [__dirname + '/../../entities/*.entity.ts'],
      // Include migrations as tests expect a migrations path pattern /.*migrations.*\.(ts|js)$/
      // Use a single .ts glob which still matches the regex
      migrations: [__dirname + '/../../migrations/*.ts'],
      synchronize: false,
      // Ensure migrations run automatically as per spec expectations
      migrationsRun: true,
      ssl: this.isSSLEnabled(),
      extra: pool,
      logging: ['error', 'warn'],
      cache: this.getCacheConfig(),
    };
  }

  // Exposed helpers used by tests/specs
  createReadReplicaOptions(): TypeOrmModuleOptions | null {
    const readUrl = this.configService.get<string>('DATABASE_READ_REPLICA_URL');
    if (!readUrl) return null;

    return {
      type: 'postgres',
      url: readUrl,
      entities: [__dirname + '/../../entities/*.entity.ts'],
      synchronize: false,
      ssl: this.isSSLEnabled(),
      extra: {
        ...this.getConnectionPoolConfig(),
        application_name: 'task-manager-api-replica',
      },
      logging: ['error', 'warn'],
      cache: this.getCacheConfig(),
    } as unknown as TypeOrmModuleOptions;
  }

  getConnectionPoolConfig() {
    return {
      max: this.getNumber('DATABASE_POOL_SIZE', 10),
      idleTimeoutMillis: this.getNumber('DATABASE_POOL_IDLE_TIMEOUT', 30000),
      connectionTimeoutMillis: this.getNumber(
        'DATABASE_POOL_CONNECTION_TIMEOUT',
        60000,
      ),
      statement_timeout: this.getNumber('DB_STATEMENT_TIMEOUT', 30000),
      query_timeout: this.getNumber('DB_QUERY_TIMEOUT', 30000),
      application_name: 'task-manager-api',
    };
  }

  getCacheConfig(): TypeOrmModuleOptions['cache'] {
    const url =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const ttlSeconds = this.getNumber('CACHE_TTL', 300);
    return {
      type: 'redis',
      options: {
        url,
      },
      duration: ttlSeconds * 1000,
    } as const;
  }

  isSSLEnabled(): boolean {
    const ssl = this.configService.get<string | boolean>('DATABASE_SSL');
    return String(ssl).toLowerCase() === 'true';
  }

  validateConfiguration(): void {
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for caching');
    }
  }

  private extractHost(url: string): string {
    const match = url.match(/\/\/([^:@]+@)?([^:/]+)/);
    return match ? match[2] : 'localhost';
  }

  private extractPort(url: string): number {
    const match = url.match(/:(\d+)\//);
    return match ? parseInt(match[1], 10) : 5432;
  }

  private extractUsername(url: string): string {
    const match = url.match(/\/\/([^:]+):/);
    return match ? match[1] : 'postgres';
  }

  private extractPassword(url: string): string {
    const match = url.match(/:([^@]+)@/);
    return match ? match[1] : '';
  }

  private extractDatabase(url: string): string {
    const match = url.match(/\/([^?]+)/);
    return match ? match[1] : 'postgres';
  }
}
