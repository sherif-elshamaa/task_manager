import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, TestApp } from './test-config';

describe('Comments (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let accessToken: string;
  let taskId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;

    const signupData = {
      tenant_name: 'Comment Test Corp',
      owner: {
        first_name: 'Comment',
        last_name: 'Admin',
        email: 'comment.admin@testcorp.com',
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

    const projectData = { name: 'Comment Project', workspace_id: workspaceResponse.body.workspace_id };
    const projectResponse = await request(app.getHttpServer())
      .post('/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(projectData);

    const taskData = { title: 'Comment Task' };
    const taskResponse = await request(app.getHttpServer())
      .post(`/v1/projects/${projectResponse.body.project_id}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(taskData);
    taskId = taskResponse.body.task_id;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('POST /v1/tasks/:taskId/comments - should create a new comment on a task', async () => {
    const commentData = {
      text: 'This is a test comment.',
    };

    const response = await request(app.getHttpServer())
      .post(`/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(commentData)
      .expect(201);

    expect(response.body).toHaveProperty('comment_id');
    expect(response.body.text).toBe(commentData.text);
  });

  it('GET /v1/tasks/:taskId/comments - should get all comments for a task', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.items).toBeInstanceOf(Array);
    expect(response.body.items.length).toBeGreaterThan(0);
  });
});
