import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, TestApp } from './test-config';

describe('Debug Tasks (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;

    const signupData = {
      tenant_name: 'Debug Test Corp',
      owner: {
        first_name: 'Debug',
        last_name: 'Admin',
        email: 'debug.admin@testcorp.com',
        password: 'SecurePassword123!',
      },
    };

    const signupResponse = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send(signupData);

    console.log('Signup response:', signupResponse.status, signupResponse.body);
    accessToken = signupResponse.body.access_token;

    const workspaceData = { name: 'Debug Workspace' };
    const workspaceResponse = await request(app.getHttpServer())
      .post('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(workspaceData);

    console.log('Workspace response:', workspaceResponse.status, workspaceResponse.body);

    const projectData = { name: 'Debug Project', workspace_id: workspaceResponse.body.workspace_id };
    const projectResponse = await request(app.getHttpServer())
      .post('/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(projectData);
    
    console.log('Project response:', projectResponse.status, projectResponse.body);
    projectId = projectResponse.body.project_id;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('should debug task creation', async () => {
    const taskData = {
      title: 'Debug Task',
      description: 'A debug task for e2e tests',
    };

    console.log('Creating task with projectId:', projectId);
    console.log('Task data:', taskData);

    const response = await request(app.getHttpServer())
      .post(`/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(taskData);

    console.log('Task creation response:', response.status, response.body);
    
    if (response.status !== 201) {
      console.log('Task creation failed with status:', response.status);
      console.log('Response body:', response.body);
    }

    expect(response.status).toBe(201);
  });
});
