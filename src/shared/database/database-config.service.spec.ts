import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfigService } from './database-config.service';

describe('DatabaseConfigService', () => {
  let service: DatabaseConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseConfigService>(DatabaseConfigService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/taskmanager',
        DATABASE_READ_REPLICA_URL:
          'postgresql://user:pass@replica:5432/taskmanager',
        DATABASE_SSL: 'true',
        DATABASE_POOL_SIZE: '20',
        DATABASE_POOL_IDLE_TIMEOUT: '30000',
        DATABASE_POOL_CONNECTION_TIMEOUT: '60000',
        REDIS_URL: 'redis://localhost:6379',
        CACHE_TTL: '300',
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

  describe('createTypeOrmOptions', () => {
    it('should create TypeORM options with default configuration', () => {
      const options = service.createTypeOrmOptions();

      expect(options).toEqual({
        type: 'postgres',
        url: 'postgresql://user:pass@localhost:5432/taskmanager',
        entities: [expect.stringMatching(/.*\.entity\.(ts|js)$/)],
        migrations: [expect.stringMatching(/.*migrations.*\.(ts|js)$/)],
        synchronize: false,
        migrationsRun: true,
        ssl: true,
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 60000,
          statement_timeout: 30000,
          query_timeout: 30000,
          application_name: 'task-manager-api',
        },
        logging: ['error', 'warn'],
        cache: {
          type: 'redis',
          options: {
            url: 'redis://localhost:6379',
          },
          duration: 300000,
        },
      });
    });

    it('should handle missing environment variables gracefully', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const options = service.createTypeOrmOptions();

      expect(options.url).toBe('postgresql://localhost:5432/taskmanager');
      expect(options.ssl).toBe(false);
      expect(options.extra.max).toBe(10);
    });

    it('should parse SSL configuration correctly', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_SSL') return 'false';
        return undefined;
      });

      const options = service.createTypeOrmOptions();

      expect(options.ssl).toBe(false);
    });

    it('should parse numeric configuration correctly', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          DATABASE_POOL_SIZE: '50',
          DATABASE_POOL_IDLE_TIMEOUT: '60000',
          DATABASE_POOL_CONNECTION_TIMEOUT: '120000',
          CACHE_TTL: '600',
        };
        return config[key];
      });

      const options = service.createTypeOrmOptions();

      expect(options.extra.max).toBe(50);
      expect(options.extra.idleTimeoutMillis).toBe(60000);
      expect(options.extra.connectionTimeoutMillis).toBe(120000);
      expect(options.cache.duration).toBe(600000);
    });
  });

  describe('createReadReplicaOptions', () => {
    it('should create read replica options when URL is provided', () => {
      const options = service.createReadReplicaOptions();

      expect(options).toEqual({
        type: 'postgres',
        url: 'postgresql://user:pass@replica:5432/taskmanager',
        entities: [expect.stringMatching(/.*\.entity\.(ts|js)$/)],
        synchronize: false,
        ssl: true,
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 60000,
          statement_timeout: 30000,
          query_timeout: 30000,
          application_name: 'task-manager-api-replica',
        },
        logging: ['error', 'warn'],
        cache: {
          type: 'redis',
          options: {
            url: 'redis://localhost:6379',
          },
          duration: 300000,
        },
      });
    });

    it('should return null when read replica URL is not provided', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_READ_REPLICA_URL') return undefined;
        return 'some-value';
      });

      const options = service.createReadReplicaOptions();

      expect(options).toBeNull();
    });
  });

  describe('getConnectionPoolConfig', () => {
    it('should return connection pool configuration', () => {
      const config = service.getConnectionPoolConfig();

      expect(config).toEqual({
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 60000,
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'task-manager-api',
      });
    });

    it('should return default values when config is missing', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const config = service.getConnectionPoolConfig();

      expect(config).toEqual({
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 60000,
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'task-manager-api',
      });
    });
  });

  describe('getCacheConfig', () => {
    it('should return cache configuration', () => {
      const config = service.getCacheConfig();

      expect(config).toEqual({
        type: 'redis',
        options: {
          url: 'redis://localhost:6379',
        },
        duration: 300000,
      });
    });

    it('should return default cache configuration when Redis URL is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return undefined;
        return 'some-value';
      });

      const config = service.getCacheConfig();

      expect(config).toEqual({
        type: 'redis',
        options: {
          url: 'redis://localhost:6379',
        },
        duration: 300000,
      });
    });
  });

  describe('isSSLEnabled', () => {
    it('should return true when SSL is enabled', () => {
      const result = service.isSSLEnabled();
      expect(result).toBe(true);
    });

    it('should return false when SSL is disabled', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_SSL') return 'false';
        return 'some-value';
      });

      const result = service.isSSLEnabled();
      expect(result).toBe(false);
    });

    it('should return false when SSL config is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_SSL') return undefined;
        return 'some-value';
      });

      const result = service.isSSLEnabled();
      expect(result).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration successfully', () => {
      expect(() => service.validateConfiguration()).not.toThrow();
    });

    it('should throw error when DATABASE_URL is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_URL') return undefined;
        return 'some-value';
      });

      expect(() => service.validateConfiguration()).toThrow(
        'DATABASE_URL is required',
      );
    });

    it('should throw error when REDIS_URL is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return undefined;
        return 'some-value';
      });

      expect(() => service.validateConfiguration()).toThrow(
        'REDIS_URL is required for caching',
      );
    });
  });
});
