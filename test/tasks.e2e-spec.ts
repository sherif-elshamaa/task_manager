import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, TestApp } from './test-config';

describe('Tasks (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;

    const signupData = {
      tenant_name: 'Task Test Corp',
      owner: {
        first_name: 'Task',
        last_name: 'Admin',
        email: 'task.admin@testcorp.com',
        password: 'SecurePassword123!',
      },
    };

    const signupResponse = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send(signupData);

    accessToken = signupResponse.body.access_token;

    const workspaceData = { name: 'Default Workspace' };
    const workspaceResponse = await request(app.getHttpServer())
      .post('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(workspaceData);

    const projectData = { name: 'Task Project', workspace_id: workspaceResponse.body.workspace_id };
    const projectResponse = await request(app.getHttpServer())
      .post('/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(projectData);
    projectId = projectResponse.body.project_id;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  let taskId: string;

  it('POST /v1/projects/:projectId/tasks - should create a new task', async () => {
    const taskData = {
      title: 'My First Task',
      description: 'A test task for e2e tests',
    };

    const response = await request(app.getHttpServer())
      .post(`/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(taskData)
      .expect(201);

    expect(response.body).toHaveProperty('task_id');
    expect(response.body.title).toBe(taskData.title);
    taskId = response.body.task_id;
  });

  it('GET /v1/projects/:projectId/tasks - should get all tasks for a project', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThan(0);
  });

  it('GET /v1/projects/:projectId/tasks/:id - should get a single task by ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.task_id).toBe(taskId);
  });

  it('PATCH /v1/projects/:projectId/tasks/:id - should update a task', async () => {
    const updateData = { title: 'Updated Task Title' };

    const response = await request(app.getHttpServer())
      .patch(`/v1/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.title).toBe(updateData.title);
  });

  it('DELETE /v1/projects/:projectId/tasks/:id - should delete a task', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/v1/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
