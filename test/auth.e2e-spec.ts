import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, TestApp } from './test-config';

interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  role: string;
}

interface SignupResponse {
  tenant: Tenant;
  user: User;
  access_token: string;
  refresh_token: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

describe('Authentication (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  describe('POST /v1/auth/signup', () => {
    it('should create a new tenant and owner user', async () => {
      const signupData = {
        tenant_name: 'Test Corp',
        owner: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@testcorp.com',
          password: 'SecurePass123!',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData)
        .expect(201);

      const body = response.body as SignupResponse;
      expect(body).toHaveProperty('tenant');
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');

      expect(body.tenant.name).toBe('Test Corp');
      expect(body.user.email).toBe('john.doe@testcorp.com');
      expect(body.user.role).toBe('owner');
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');
    });

    it('should reject signup with invalid email', async () => {
      const signupData = {
        tenant_name: 'Invalid Corp',
        owner: {
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'invalid-email',
          password: 'SecurePass123!',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData)
        .expect(400);
    });

    it('should reject signup with weak password', async () => {
      const signupData = {
        tenant_name: 'Weak Corp',
        owner: {
          first_name: 'Bob',
          last_name: 'Smith',
          email: 'bob@weakcorp.com',
          password: '123',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData)
        .expect(400);
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test tenant and user for login tests
      const signupData = {
        tenant_name: 'Login Test Corp',
        owner: {
          first_name: 'Login',
          last_name: 'Test',
          email: 'login@testcorp.com',
          password: 'SecurePass123!',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@testcorp.com',
        password: 'SecurePass123!',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(201);

      const body = response.body as LoginResponse;
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@testcorp.com',
        password: 'SecurePass123!',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login@testcorp.com',
        password: 'WrongPassword123!',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(401);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create a test user and get refresh token
      const signupData = {
        tenant_name: 'Refresh Test Corp',
        owner: {
          first_name: 'Refresh',
          last_name: 'Test',
          email: 'refresh@testcorp.com',
          password: 'SecurePass123!',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const signupResponse = await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData);

      refreshToken = (signupResponse.body as SignupResponse).refresh_token;
    });

    it('should refresh tokens with valid refresh token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      const body = response.body as RefreshTokenResponse;
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');
    });

    it('should reject refresh with invalid token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(400);
    });
  });

  describe('POST /v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create a test user and get tokens
      const signupData = {
        tenant_name: 'Logout Test Corp',
        owner: {
          first_name: 'Logout',
          last_name: 'Test',
          email: 'logout@testcorp.com',
          password: 'SecurePass123!',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const signupResponse = await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData);

      const body = signupResponse.body as SignupResponse;
      accessToken = body.access_token;
      refreshToken = body.refresh_token;
    });

    it('should logout and revoke refresh token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refresh_token: refreshToken })
        .expect(200);

      // Verify refresh token is revoked
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });
  });

  describe('Protected routes', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create a test user and get access token
      const signupData = {
        tenant_name: 'Protected Test Corp',
        owner: {
          first_name: 'Protected',
          last_name: 'Test',
          email: 'protected@testcorp.com',
          password: 'SecurePass123!',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const signupResponse = await request(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(signupData);

      accessToken = (signupResponse.body as SignupResponse).access_token;
    });

    it('should access protected route with valid token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject access to protected route without token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
    });

    it('should reject access to protected route with invalid token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
