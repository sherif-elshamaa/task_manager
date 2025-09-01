import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, TestApp } from './test-config';
import { clearDatabase } from './test-utils';

describe('Workspaces (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;

    // Create a user and get an access token
    const signupData = {
      tenant_name: 'Workspace Test Corp',
      owner: {
        first_name: 'Workspace',
        last_name: 'Admin',
        email: 'workspace.admin@testcorp.com',
        password: 'SecurePassword123!',
      },
    };

    const response = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send(signupData);

    accessToken = response.body.access_token;
  });

  afterAll(async () => {
    await clearDatabase(app);
    await closeTestApp(testApp);
  });

  let workspaceId: string;

  it('POST /v1/workspaces - should create a new workspace', async () => {
    const workspaceData = {
      name: 'My First Workspace',
      description: 'A test workspace for e2e tests',
    };

    const response = await request(app.getHttpServer())
      .post('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(workspaceData)
      .expect(201);

    expect(response.body).toHaveProperty('workspace_id');
    expect(response.body.name).toBe(workspaceData.name);
    expect(response.body.description).toBe(workspaceData.description);
    workspaceId = response.body.workspace_id;
  });

  it('GET /v1/workspaces - should get all workspaces for the tenant', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.items).toBeInstanceOf(Array);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0].name).toBe('My First Workspace');
  });

  it('GET /v1/workspaces/:id - should get a single workspace by ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.workspace_id).toBe(workspaceId);
    expect(response.body.name).toBe('My First Workspace');
  });

  it('PATCH /v1/workspaces/:id - should update a workspace', async () => {
    const updateData = {
      name: 'Updated Workspace Name',
    };

    const response = await request(app.getHttpServer())
      .patch(`/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
  });

  it('DELETE /v1/workspaces/:id - should delete a workspace', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Verify we can no longer access it (as we are no longer a member)
    await request(app.getHttpServer())
      .get(`/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
