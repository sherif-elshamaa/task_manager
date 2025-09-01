# Multi-Tenant Task Management API — Intensive Architecture Blueprint

This document is an **intensive, production-ready blueprint** for the Multi‑Tenant Task Management API (Asana-like). It expands the high-level design into a full list of endpoints, request/response contracts, security, operational requirements, scaling strategy, data model details, CI/CD & infra checklist, testing matrix, and runbook items.

---

# 1. Executive Summary

* **Goal:** Build a multi-tenant, secure, highly-available Task Management API with tenant isolation (shared schema), RBAC, observability, and production-grade operational practices.
* **Stack:** NestJS, TypeORM, PostgreSQL, Redis (cache + queues), BullMQ (workers), S3-compatible storage, Docker, CI/CD (GitHub Actions), Prometheus/Grafana, ELK/Loki, Sentry.

---

# 2. Tenancy & Data Strategy

**Chosen strategy:** Shared schema with a `tenant_id` column on tenant-scoped tables.

**Enforcement layers:**

* Tenant in JWT (short lived) + middleware/tenant-context provider.
* Guards (TenantGuard + RolesGuard) to protect endpoints.
* Repository-level scoping (BaseRepository or QueryBuilder wrappers) to always include `tenant_id` in WHERE clauses.
* Unit tests & integration tests asserting tenant isolation.

**When to consider migration:** If any tenant grows into TBs or requires strict physical isolation, plan migration to schema-per-tenant or DB-per-tenant.

---

# 3. Full ERD (Production-ready fields + audit)

**tenants**

* tenant\_id UUID PK
* name VARCHAR
* plan VARCHAR
* status ENUM('active','suspended','deleted')
* created\_at TIMESTAMP
* updated\_at TIMESTAMP

**users**

* user\_id UUID PK
* tenant\_id FK -> tenants.tenant\_id
* first\_name VARCHAR
* last\_name VARCHAR
* email VARCHAR (unique per tenant)
* password\_hash TEXT
* role ENUM('owner','admin','member')
* is\_active BOOLEAN
* last\_login TIMESTAMP
* created\_at TIMESTAMP
* updated\_at TIMESTAMP
* metadata JSONB

**workspaces**

* workspace\_id UUID PK
* tenant\_id FK
* name VARCHAR
* description TEXT
* created\_by UUID -> users.user\_id
* is\_archived BOOLEAN
* created\_at, updated\_at

**projects**

* project\_id UUID PK
* tenant\_id FK
* workspace\_id FK (nullable)
* name VARCHAR
* description TEXT
* visibility ENUM('private','workspace','tenant')
* created\_by UUID
* created\_at, updated\_at

**tasks**

* task\_id UUID PK
* tenant\_id FK
* project\_id FK
* title VARCHAR
* description TEXT
* status ENUM('todo','in\_progress','done','archived')
* priority ENUM('low','medium','high','critical')
* assigned\_to UUID nullable
* attachments JSONB (list of S3 keys + metadata)
* start\_date DATE, due\_date DATE
* estimate\_minutes INT nullable
* created\_by UUID
* updated\_by UUID
* created\_at, updated\_at

**comments**

* comment\_id UUID PK
* tenant\_id FK
* task\_id FK
* text TEXT
* created\_by UUID
* created\_at

**activity\_logs**

* log\_id UUID PK
* tenant\_id FK
* actor\_id UUID
* resource\_type VARCHAR
* resource\_id UUID
* action VARCHAR
* data JSONB
* created\_at

**refresh\_tokens** (for refresh token rotation)

* id UUID PK
* user\_id FK
* tenant\_id FK
* token\_hash TEXT
* revoked BOOLEAN
* created\_at, expires\_at

**Indexes & Partitioning**

* Index `(tenant_id)` on tasks, projects, comments, activity\_logs
* Composite index `(tenant_id, project_id, status)` on tasks
* Use table partitioning by `tenant_id` or time (created\_at) for very large event-style tables (activity\_logs)

---

# 4. Complete API Endpoint Catalog (REST, versioned)

**Base:** `POST /v1/...` (use `v1` namespace). Use OpenAPI/Swagger for documentation.

## Auth & Tenant Onboarding

* `POST /v1/auth/signup` — Create tenant + owner user

  * Body: `{ tenant_name, owner: { first_name, last_name, email, password } }`
  * Response: `201 { tenant_id, user: { user_id, email }, access_token, refresh_token }`
* `POST /v1/auth/login` — Email + password

  * Body: `{ email, password }` (tenant derived from user record)
  * Response: `{ access_token, refresh_token, expires_in }`
* `POST /v1/auth/refresh` — Rotate refresh token

  * Body: `{ refresh_token }` -> issues new access + refresh
* `POST /v1/auth/logout` — Revoke refresh token
* `POST /v1/auth/forgot-password` — Start reset flow (email)
* `POST /v1/auth/reset-password` — Finish reset

## Tenant (Platform admin only)

* `GET /v1/tenants` — list tenants (admin)
* `GET /v1/tenants/:tenantId` — get tenant details
* `PATCH /v1/tenants/:tenantId` — update plan/status

## Users

* `GET /v1/users/me` — current user profile (JWT)
* `PATCH /v1/users/me` — update profile
* `POST /v1/tenants/:tenantId/invite` — invite user by email (owner/admin)
* `POST /v1/invites/accept` — accept invite (token-based) — create user under tenant
* `GET /v1/users` — list users in tenant (admin)
* `PATCH /v1/users/:userId/role` — change role (owner/admin only)
* `DELETE /v1/users/:userId` — deactivate user

## Workspaces

* `POST /v1/workspaces` — create
* `GET /v1/workspaces` — list (tenant-scoped)
* `GET /v1/workspaces/:id` — details
* `PATCH /v1/workspaces/:id` — update
* `DELETE /v1/workspaces/:id` — archive
* `POST /v1/workspaces/:id/members` — add member (role)

## Projects

* `POST /v1/projects` — create project (body includes workspace\_id optional)
* `GET /v1/projects` — list projects (supports `?workspaceId=&page=&limit=&q=&sort=`)
* `GET /v1/projects/:projectId` — get project details
* `PATCH /v1/projects/:projectId` — update
* `DELETE /v1/projects/:projectId` — archive/delete

## Tasks

* `POST /v1/projects/:projectId/tasks` — create task

  * Body: `{ title, description, priority, due_date, assigned_to? }`
* `GET /v1/projects/:projectId/tasks` — list tasks (filters: status, assigned\_to, due\_before, q, page, limit, sort)
* `GET /v1/tasks/:taskId` — task details
* `PATCH /v1/tasks/:taskId` — partial update (status transitions validated)
* `DELETE /v1/tasks/:taskId` — delete/archive
* `POST /v1/tasks/:taskId/assign` — assign/unassign user(s)
* `POST /v1/tasks/bulk` — bulk update tasks (change status / assign) — admin only

## Comments & Attachments

* `POST /v1/tasks/:taskId/comments` — add comment
* `GET /v1/tasks/:taskId/comments` — list comments
* `POST /v1/tasks/:taskId/attachments` — upload file (presigned URL flow)
* `DELETE /v1/attachments/:id` — remove attachment (permission checked)

## Activity Logs / Audit

* `GET /v1/activity` — list tenant activity (admin)

## Admin / Platform

* `GET /v1/admin/health` — healthchecks
* `POST /v1/admin/jobs/retry` — retry failed jobs (platform admin)

---

# 5. Request/Response Contracts (examples)

### Signup

**POST /v1/auth/signup**
Request:

```json
{
  "tenant_name": "Acme Corp",
  "owner": { "first_name": "Alice", "last_name": "Doe", "email": "alice@acme.com", "password": "P@ssw0rd" }
}
```

Response (201):

```json
{
  "tenant": { "tenant_id": "...", "name": "Acme Corp" },
  "user": { "user_id": "...", "email": "alice@acme.com", "role": "owner" },
  "access_token": "ey..",
  "refresh_token": "rft.."
}
```

### Create Task

**POST /v1/projects/:projectId/tasks** (Auth required)
Request body:

```json
{
  "title": "Finish billing integration",
  "description": "Implement Stripe webhook handler",
  "priority": "high",
  "due_date": "2025-09-01",
  "assigned_to": "user-uuid"
}
```

Response (201): created task object with `tenant_id` and audit fields.

---

# 6. Auth & Security Design

**JWT Access Tokens**

* Short-lived (e.g., 15m) access tokens, signed with strong secret or asymmetric keys (RS256) if you need key rotation.
* Tokens include minimal claims: `sub`, `tenant_id`, `roles`, `iat`, `exp`.

**Refresh Tokens**

* Long-lived (7–30 days) refresh tokens stored hashed in DB for rotation & revocation.
* Use refresh token rotation: issue new refresh on each use, revoke old.

**Password Storage**

* Use `argon2` or `bcrypt` with sufficient cost. Do not log raw passwords.

**Rate limiting**

* Global: limit per IP and per user for auth endpoints (e.g., 5 login attempts per minute).
* Use Redis-backed rate limiter for clustered deployments.

**Secrets**

* Store secrets in managed secret manager (AWS Secrets Manager, GCP Secret Manager) or environment variables injected by orchestration.

**TLS**

* Enforce TLS everywhere (clients ↔ API, API ↔ DB via cloud managed TLS); use HSTS.

**Input validation & sanitization**

* Use `class-validator` + global `ValidationPipe({ whitelist: true, transform: true })`.
* Escape / sanitize HTML in comments to prevent XSS in clients.

**OWASP protections**

* CSRF is less relevant for token-based APIs, but protect cookie-based flows if used.
* Use helmet, set secure headers.

**Logging**

* Structured logging (JSON) with correlation id for tracing requests.
* Don't log secrets or tokens.

---

# 7. Observability & Monitoring

**Metrics**

* Expose Prometheus metrics for HTTP latency, error rates, DB query timings, queue backlog.

**Tracing**

* Use distributed tracing (OpenTelemetry -> Jaeger) to trace requests across workers & db.

**Logging**

* Centralized logs in ELK or Loki; parse logs for errors & alerts.

**Error tracking**

* Sentry or similar for exceptions and performance monitoring.

**Alerts**

* Page on: error rate > X%, DB connections > 80%, worker queue length > threshold, disk or S3 errors.

---

# 8. CI/CD & Release Process

**Pipeline**

* PR → run linters, unit tests, type checks → build container image → run integration tests → deploy to staging → run smoke tests → manual or automated promotion to production.

**DB Migrations**

* Use TypeORM migrations or Flyway. Migrations run as part of deploy pipeline, not `synchronize: true` in prod.
* Migration rollback plan prepared and tested.

**Feature flags & canary**

* Support toggling new features via a flag system (e.g., LaunchDarkly or homegrown).
* Canary deploys and blue/green supported by infra.

---

# 9. Security, Compliance & Data Protection

**Backups**

* Automated daily backups, point-in-time recovery (PITR) enabled for PG.
* Periodic restore drills to verify backup integrity.

**Data retention & deletion**

* Retention policy per tenant; soft-delete resources with `deleted_at` and hard-delete after retention window.
* Provide endpoints for tenant data export & deletion (GDPR/CCPA compliance).

**Access Controls**

* Strict least privilege for services; DB users with minimal roles.
* Audit logs for admin actions.

**Pen testing & code scanning**

* Static analysis (Snyk/Dependabot), secret scanning in CI, and periodic penetration tests.

---

# 10. Scaling & Performance

**Horizontal scaling**

* Backend: stateless replicas behind load balancer.
* Workers: scaled independently based on queue length.

**Database scaling**

* Read replicas for heavy read workloads.
* Connection pooling (PgBouncer) to avoid connection storms.
* Caching layer (Redis) for expensive reads.

**Optimizations**

* Use pagination (cursor-based) for lists.
* Batch writes for bulk operations.
* Use async jobs for heavy tasks (file processing, notifications).

---

# 11. Testing Matrix

* Unit tests for services and guards.
* Integration tests for controllers + DB (run in CI using ephemeral DB container).
* End-to-end tests for critical flows (signup, login, create project/task, RBAC enforcement).
* Load tests to validate horizontal scaling and DB limits.

---

# 12. Runbook & Operational Playbook (short)

**On DB connection spike / errors**

* Check connection pool usage, slow queries, CPU.
* Restart app pods one at a time; scale read replicas if needed.

**On worker backlog growth**

* Check Redis, inspect failed jobs, increase worker replicas, investigate job handler errors.

**On security incident**

* Rotate secrets, invalidate refresh tokens (bulk revoke), notify affected tenants, follow incident response policy.

---

# 13. Deliverables & Checklist to finish Product-Ready API

* [ ] Data model implemented with migrations
* [ ] Auth (signup/login/refresh/revoke) with refresh token rotation
* [ ] Tenant onboarding & invite flows
* [ ] TenantGuard and RolesGuard implemented + tested
* [ ] CRUD endpoints for projects/tasks/comments + validation
* [ ] File upload flow with presigned URLs & virus scanning integration 
* [ ] Background workers (email, notifications) wired with BullMQ
* [ ] Logging, metrics, tracing and Sentry integration
* [ ] CI pipeline with tests and migration step
* [ ] Production deployment manifests (helm / terraform) + secrets
* [ ] Backup & restore tested, retention policy configured
* [ ] Load test report and capacity planning



