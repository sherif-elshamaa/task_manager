import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { createTestApp, closeTestApp, TestApp } from './test-config';
import { clearDatabase } from './test-utils';

interface SignupResponse {
  access_token: string;
}

interface WorkspaceResponse {
  workspace_id: string;
}

interface InviteResponse {
  invite_id: string;
  email: string;
}

describe('Invites (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let ownerAccessToken: string;
  let memberAccessToken: string;
  let workspaceId: string;
  let inviteId: string;
  let ownerId: string;
  let tenantId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;

    // Create owner and get an access token
    const ownerSignupData = {
      tenant_name: 'Invites Test Corp',
      owner: {
        first_name: 'Invites',
        last_name: 'Admin',
        email: 'invites.admin@testcorp.com',
        password: 'SecurePassword123!',
      },
    };

    const ownerResponse = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send(ownerSignupData);

    const signupResponse = ownerResponse.body as SignupResponse;
    ownerAccessToken = signupResponse.access_token;
    const decodedToken = jwtDecode<JwtPayload & { tenantId: string }>(ownerAccessToken);
    ownerId = decodedToken.sub!;
    tenantId = decodedToken.tenantId;

    // Create a workspace
    const workspaceData = {
      name: 'Test Workspace for Invites',
    };

    const workspaceResponse = await request(app.getHttpServer())
      .post('/v1/workspaces')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send(workspaceData);

    workspaceId = (workspaceResponse.body as WorkspaceResponse).workspace_id;

    // Create a member to be invited
    const memberEmail = 'invited.user@testcorp.com';
    const memberPassword = 'SecurePassword123!';

    await testApp.usersService.create({
      tenantId: tenantId,
      dto: {
        email: memberEmail,
        password: memberPassword,
        first_name: 'Invited',
        last_name: 'User',
        role: 'member',
      },
    });

    const loginResponse = await testApp.authService.login(
      memberEmail,
      memberPassword,
    );

    memberAccessToken = loginResponse.access_token;
  });

  afterAll(async () => {
    await clearDatabase(app);
    await closeTestApp(testApp);
  });

  it('should assign the creator as the workspace owner', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(200);

    const members = response.body.items as { user_id: string; role: string }[];
    const owner = members.find((m) => m.user_id === ownerId);
    expect(owner).toBeDefined();
    expect(owner!.role).toEqual('owner');
  });

  it('POST /v1/invites - should create a new invite', async () => {
    const inviteData = {
      email: 'invited.user@testcorp.com',
      role: 'member',
      workspaceId: workspaceId,
    };

    const response = await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send(inviteData)
      .expect(201);

    const body = response.body as InviteResponse;
    expect(body).toHaveProperty('invite_id');
    expect(body.email).toBe(inviteData.email);
    inviteId = body.invite_id;
  });

  it('POST /v1/invites/:id/accept - should accept an invite', async () => {
    await request(app.getHttpServer())
      .post(`/v1/invites/${inviteId}/accept`)
      .set('Authorization', `Bearer ${memberAccessToken}`)
      .expect(200);
  });

  it('POST /v1/invites - should fail to create an invite with insufficient permissions', async () => {
    const inviteData = {
      email: 'another.member@testcorp.com',
      role: 'member',
      workspaceId: workspaceId,
    };

    await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Authorization', `Bearer ${memberAccessToken}`)
      .send(inviteData)
      .expect(403);
  });

  it('DELETE /v1/invites/:id - should delete an invite', async () => {
    const inviteData = {
      email: 'to.be.deleted@testcorp.com',
      role: 'member',
      workspaceId: workspaceId,
    };

    const response = await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send(inviteData)
      .expect(201);

    const newInviteId = (response.body as InviteResponse).invite_id;

    await request(app.getHttpServer())
      .delete(`/v1/invites/${newInviteId}`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/invites/${newInviteId}`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(404);
  });
});
