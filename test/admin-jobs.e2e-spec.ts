import request from 'supertest';
import { createTestApp, closeTestApp, createTestJwt } from './test-config';

describe('Admin Jobs (e2e)', () => {
  let server: any;

  beforeAll(async () => {
    const { app } = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await closeTestApp({ app: server, module: {} as any });
  });

  it('should reject non-admin for retry', async () => {
    const token = createTestJwt({
      sub: 'u1',
      tenantId: 't1',
      roles: ['member'],
    });
    await request(server)
      .post('/v1/admin/jobs/retry')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('should accept admin retry', async () => {
    const token = createTestJwt({
      sub: 'u1',
      tenantId: 't1',
      roles: ['admin'],
    });
    const res = await request(server)
      .post('/v1/admin/jobs/retry')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.message || res.body.results).toBeDefined();
  });
});
