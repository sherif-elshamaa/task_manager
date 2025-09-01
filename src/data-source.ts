import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  entities: ['src/entities/*.entity.{ts,js}', 'dist/entities/*.entity.{ts,js}'],
  migrations: ['src/migrations/*.{ts,js}', 'dist/migrations/*.{ts,js}'],
});
