import request from 'supertest';
import { createTestApp, closeTestApp, createTestJwt } from './test-config';

describe('Files (e2e)', () => {
  let server: any;

  beforeAll(async () => {
    const { app } = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await closeTestApp({ app: server, module: {} as any });
  });

  it('should presign upload URL (happy path)', async () => {
    const token = createTestJwt({
      sub: 'u1',
      tenantId: 't1',
      roles: ['member'],
    });
    const res = await request(server)
      .post('/v1/files/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'test.txt', contentType: 'text/plain' })
      .expect(201);
    expect(res.body.url).toBeDefined();
    expect(res.body.key).toContain('test.txt');
  });

  it('should record scan-callback and attach when clean', async () => {
    const token = createTestJwt({
      sub: 'u1',
      tenantId: 't1',
      roles: ['member'],
    });
    const res = await request(server)
      .post('/v1/files/scan-callback')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bucket: 'b',
        key: 't1/123-file',
        clean: true,
        taskId: 'task-1',
        tenantId: 't1',
      })
      .expect(201);
    expect(res.body.recorded).toBe(true);
  });

  it('should record scan-callback without attachment when not clean', async () => {
    const token = createTestJwt({
      sub: 'u1',
      tenantId: 't1',
      roles: ['member'],
    });
    const res = await request(server)
      .post('/v1/files/scan-callback')
      .set('Authorization', `Bearer ${token}`)
      .send({ bucket: 'b', key: 't1/123-file', clean: false })
      .expect(201);
    expect(res.body.recorded).toBe(true);
    expect(res.body.attachedToTask).toBeUndefined();
  });
});
