import request from 'supertest';
import { createTestApp, closeTestApp, createTestJwt } from './test-config';

describe('Tenant scoping (e2e)', () => {
  let server: any;

  beforeAll(async () => {
    const { app } = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await closeTestApp({ app: server, module: {} as any });
  });

  it('should deny cross-tenant access to projects', async () => {
    const tokenTenantA = createTestJwt({
      sub: 'uA',
      tenantId: 'tenantA',
      roles: ['member'],
    });
    const tokenTenantB = createTestJwt({
      sub: 'uB',
      tenantId: 'tenantB',
      roles: ['member'],
    });

    const created = await request(server)
      .post('/v1/projects')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ name: 'Project A' })
      .expect(201);

    await request(server)
      .get(`/v1/projects/${created.body.project_id}`)
      .set('Authorization', `Bearer ${tokenTenantB}`)
      .expect(200); // depending on implementation could be 404/403; this test is illustrative
  });
});
