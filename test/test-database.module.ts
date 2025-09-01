import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('TEST_DB_HOST', 'localhost'),
        port: Number(configService.get('TEST_DB_PORT', 5432)),
        username: configService.get('TEST_DB_USERNAME', 'postgres'),
        password: configService.get('TEST_DB_PASSWORD', 'postgres'),
        database: configService.get('TEST_DB_NAME', 'task_manager'),
        entities: [__dirname + '/../src/entities/*.entity.{ts,js}'],
        synchronize: true, // Only for tests
        dropSchema: true, // Clean slate for each test run
        logging: false,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'TEST_DATA_SOURCE',
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [DataSource],
    },
  ],
  exports: ['TEST_DATA_SOURCE'],
})
export class TestDatabaseModule {}
