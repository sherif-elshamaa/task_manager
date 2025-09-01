import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TestDatabaseModule } from './test-database.module';
import { SharedModule } from '../src/shared/shared.module';
import { JobsModule } from '../src/jobs/jobs.module';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { AuthService } from '../src/auth/auth.service';
import { LoggerModule } from 'nestjs-pino';
import { UsersModule } from '../src/users/users.module';
import { TenantsModule } from '../src/tenants/tenants.module';
import { WorkspacesModule } from '../src/workspaces/workspaces.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { TasksModule } from '../src/tasks/tasks.module';
import { CommentsModule } from '../src/comments/comments.module';
import { InvitesModule } from '../src/invites/invites.module';
import { ActivityLogsModule } from '../src/activity-logs/activity-logs.module';

export interface TestApp {
  app: INestApplication;
  usersService: UsersService;
  authService: AuthService;
  module: TestingModule;
}

export const createTestApp = async (): Promise<TestApp> => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        // Avoid relying on external .env.test
        load: [
          () => ({
            TEST_DB_HOST: 'localhost',
            TEST_DB_PORT: 5432,
            TEST_DB_USERNAME: 'postgres',
            TEST_DB_PASSWORD: 'postgres',
            TEST_DB_NAME: 'task_manager',
            JWT_SECRET: 'test-secret',
            REDIS_URL: 'redis://localhost:6379',
          }),
        ],
      }),
      LoggerModule.forRoot({
        pinoHttp: {
          level: 'silent', // Disable logging during tests
        },
      }),
      TestDatabaseModule,
      SharedModule,
      JobsModule,
      AppModule,
      UsersModule,
      TenantsModule,
      WorkspacesModule,
      ProjectsModule,
      TasksModule,
      CommentsModule,
      InvitesModule,
      ActivityLogsModule,
    ],
  }).compile();

  const app = module.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  app.setGlobalPrefix('v1');

  await app.init();

  const usersService = app.get(UsersService);
  const authService = app.get(AuthService);

  return { app, usersService, authService, module };
};

export const closeTestApp = async (testApp: TestApp): Promise<void> => {
  await testApp.app.close();
  await testApp.module.close();
};

const mockSign = jest.fn((payload: object): string => {
  return jwt.sign(payload, 'test-secret');
});

const mockVerify = jest.fn((_token: string) => ({
  id: 'user-id',
}));

const mockJwtService: { sign: jest.Mock; verify: jest.Mock } = {
  sign: mockSign,
  verify: mockVerify,
};

export const createTestJwt = (payload: object): string =>
  mockJwtService.sign(payload) as string;
export const createTestTenantContext = (
  tenantId: string,
  userId: string,
  roles: string[] = ['member'],
) => ({
  tenantId,
  userId,
  roles,
});

export const mockRequest = (user?: object, tenantId?: string) => ({
  user,
  headers: {
    authorization: user ? `Bearer ${createTestJwt(user)}` : undefined,
  },
  tenantId,
});

export const mockResponse = (): {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
} => {
  const res: { status?: jest.Mock; json?: jest.Mock; send?: jest.Mock } = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as { status: jest.Mock; json: jest.Mock; send: jest.Mock };
};
