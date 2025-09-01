import request from 'supertest';
import { createTestApp, closeTestApp, createTestJwt } from './test-config';

describe('Attachments (e2e)', () => {
  let server: any;
  const tenantId = 't1';
  const token = createTestJwt({ sub: 'u1', tenantId, roles: ['member'] });

  beforeAll(async () => {
    const { app } = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await closeTestApp({ app: server, module: {} as any });
  });

  it('should add and remove attachments on task', async () => {
    // Create project
    const proj = await request(server)
      .post('/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'P' })
      .expect(201);

    // Create task
    const task = await request(server)
      .post(`/v1/projects/${proj.body.project_id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T1' })
      .expect(201);

    // Add attachment via update
    await request(server)
      .patch(`/v1/projects/${proj.body.project_id}/tasks/${task.body.task_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        attachments: [
          { key: 'k1', filename: 'f.txt', size: 1, mime_type: 'text/plain' },
        ],
      })
      .expect(200);

    // Remove attachment
    await request(server)
      .delete(
        `/v1/projects/${proj.body.project_id}/tasks/${task.body.task_id}/attachments/k1`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
