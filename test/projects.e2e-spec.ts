import * as http from 'http';
import { INestApplication } from '@nestjs/common';
import { Connection } from 'typeorm';
import request from 'supertest';
import { createTestApp, closeTestApp, TestApp } from './test-config';

interface SignupResponse {
  access_token: string;
}

interface ProjectResponse {
  project_id: string;
  name: string;
  items: unknown[];
}

describe('Projects (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let accessToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;

    const signupData = {
      tenant_name: 'Project Test Corp',
      owner: {
        first_name: 'Project',
        last_name: 'Admin',
        email: 'project.admin@testcorp.com',
        password: 'SecurePassword123!',
      },
    };

    const signupResponse = await request(app.getHttpServer() as http.Server)
      .post('/v1/auth/signup')
      .send(signupData);

    accessToken = (signupResponse.body as SignupResponse).access_token;

    const workspaceRes = await request(app.getHttpServer() as http.Server)
      .post('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Default Workspace' });
    expect(workspaceRes.status).toBe(201);
    const body = workspaceRes.body as { workspace_id: string };
    expect(body.workspace_id).toBeDefined();
    workspaceId = body.workspace_id;
  });

  afterAll(async () => {
    const connection = testApp.module.get<Connection>(Connection);
    await connection.query('TRUNCATE TABLE projects CASCADE');
    await connection.query('TRUNCATE TABLE workspace_members CASCADE');
    await connection.query('TRUNCATE TABLE workspaces CASCADE');
    await connection.query('TRUNCATE TABLE tenants CASCADE');
    await connection.query('TRUNCATE TABLE users CASCADE');
    await closeTestApp(testApp);
  });

  let projectId: string;

  it('POST /v1/projects - should create a new project', async () => {
    const projectData = {
      name: 'My First Project',
      description: 'A test project for e2e tests',
      workspace_id: workspaceId,
    };

    const response = await request(app.getHttpServer() as http.Server)
      .post('/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(projectData)
      .expect(201);

    expect(response.body).toHaveProperty('project_id');
    expect((response.body as ProjectResponse).name).toBe(projectData.name);
    projectId = (response.body as ProjectResponse).project_id;
  });

  it('GET /v1/projects - should get all projects for the tenant', async () => {
    const response = await request(app.getHttpServer() as http.Server)
      .get('/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as ProjectResponse).items).toBeInstanceOf(Array);
    expect((response.body as ProjectResponse).items.length).toBeGreaterThan(0);
  });

  it('GET /v1/projects/:id - should get a single project by ID', async () => {
    const response = await request(app.getHttpServer() as http.Server)
      .get(`/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as ProjectResponse).project_id).toBe(projectId);
  });

  it('PATCH /v1/projects/:id - should update a project', async () => {
    const updateData = { name: 'Updated Project Name' };

    const response = await request(app.getHttpServer() as http.Server)
      .patch(`/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData)
      .expect(200);

    expect((response.body as ProjectResponse).name).toBe(updateData.name);
  });

  it('DELETE /v1/projects/:id - should delete a project', async () => {
    await request(app.getHttpServer() as http.Server)
      .delete(`/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer() as http.Server)
      .get(`/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
