# Task Manager API — Endpoints and DTOs Reference

This document enumerates all NestJS API endpoints, their full paths (with global prefix), HTTP methods, applied guards/roles, and complete DTO schemas for frontend development.

## Global Setup

- Prefix: `/v1` (from `api/src/main.ts` via `app.setGlobalPrefix('v1')`)
- Global Guards (apply to all routes unless bypassed by `@Public`):
  - `JwtAuthGuard`, `TenantGuard`, `RolesGuard`, `ThrottlerGuard` (via `APP_GUARD` in `api/src/app.module.ts`)
- Global Middleware/Pipes/Filters:
  - `TenantContextMiddleware` applied to all routes (extracts JWT and attaches tenant/user context)
  - Helmet, compression, CORS, ValidationPipe
  - Sentry exception filter (non-test environments)
- Swagger (non-production): `/v1/docs`
- Rate limiting:
  - Global throttling window: 60s, limit 120 (higher in tests)
  - Route-level `@Throttle` on public auth endpoints

Legend:
- Protected = global guards enforced (JWT auth + tenant + roles + throttling)
- Public = `@Public` — global auth/tenant/roles guards bypassed, throttling may still apply
- Role-restricted = requires one of the listed roles in addition to being authenticated

---

## AppController — base `/` (`api/src/app.controller.ts`)

- GET `/v1/` — Protected
- GET `/v1/health` — Public
- GET `/v1/health/detailed` — Public
- GET `/v1/admin/health` — Protected + Roles: `admin`
- GET `/v1/info` — Protected

## MonitoringController — base `/monitoring` (`api/src/shared/monitoring/monitoring.controller.ts`)

- GET `/v1/monitoring/metrics` — Protected
- GET `/v1/monitoring/health` — Protected
- GET `/v1/monitoring/ready` — Protected

Note: If you want unauthenticated probes, add `@Public()` or guard exclusions.

## AuthController — base `/auth` (`api/src/auth/auth.controller.ts`)

### POST `/v1/auth/login` — Public, Throttle: 5/min
**Request Body:**
```typescript
{
  email: string;        // Required, valid email format
  password: string;     // Required, string
  tenantId?: string;    // Optional, string
}
```

**Response:**
```typescript
{
  access_token: string;
  refresh_token: string;
}
```

### POST `/v1/auth/signup` — Public, Throttle: 3/min (100/min in test)
**Request Body:**
```typescript
{
  tenant_name: string;  // Required, 1-255 characters
  owner: {
    first_name: string; // Required, string
    last_name: string;  // Required, string
    email: string;      // Required, valid email format
    password: string;   // Required, 8-128 characters
  }
}
```

**Response:**
```typescript
{
  tenant: {
    tenant_id: string;
    name: string;
    plan: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  };
  user: {
    user_id: string;
    tenant_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    is_active: boolean;
    last_login?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
  };
  access_token: string;
  refresh_token: string;
}
```

### POST `/v1/auth/refresh` — Public, Throttle: 10/min
**Request Body:**
```typescript
{
  refresh_token: string; // Required, valid UUID
}
```

**Response:**
```typescript
{
  access_token: string;
  refresh_token: string;
}
```

### GET `/v1/auth/me` — Protected
**Response:**
```typescript
{
  user_id: string;
  email: string;
  tenant_id: string;
  roles: string[];
}
```

### POST `/v1/auth/logout` — Protected
**Response:**
```typescript
{
  message: string;
}
```

### POST `/v1/auth/forgot-password` — Public, Throttle: 3/min
**Request Body:**
```typescript
{
  email: string; // Required, valid email format
}
```

**Response:**
```typescript
{
  message: string;
}
```

### POST `/v1/auth/reset-password` — Public, Throttle: 3/min
**Request Body:**
```typescript
{
  password: string; // Required, 8-128 characters
  token: string;    // Required, string
}
```

**Response:**
```typescript
{
  message: string;
}
```

## TenantsController — base `/tenants` (`api/src/tenants/tenants.controller.ts`)

### POST `/v1/tenants` — Protected + Roles: `admin`
**Request Body:**
```typescript
{
  name?: string;                    // Optional, 1-255 characters
  plan?: 'free' | 'basic' | 'premium' | 'enterprise';
  status?: 'active' | 'suspended' | 'deleted';
}
```

### GET `/v1/tenants` — Protected + Roles: `admin`
**Query Parameters:**
```typescript
{
  q?: string;                       // Optional, search query
  plan?: 'free' | 'basic' | 'premium' | 'enterprise';
  status?: 'active' | 'suspended' | 'deleted';
  page?: number;                    // Default: 1
  limit?: number;                   // Default: 20
}
```

**Response:**
```typescript
{
  items: Array<{
    tenant_id: string;
    name: string;
    plan: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  }>;
  page: number;
  limit: number;
  total: number;
}
```

### GET `/v1/tenants/:id` — Protected + Roles: `admin`
**Response:**
```typescript
{
  tenant_id: string;
  name: string;
  plan: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}
```

### PATCH `/v1/tenants/:id` — Protected + Roles: `admin`
**Request Body:**
```typescript
{
  name?: string;                    // Optional, 1-255 characters
  plan?: 'free' | 'basic' | 'premium' | 'enterprise';
  status?: 'active' | 'suspended' | 'deleted';
}
```

### DELETE `/v1/tenants/:id` — Protected + Roles: `admin`
**Response:**
```typescript
{
  deleted: boolean;
}
```

### POST `/v1/tenants/:id/data-export` — Protected + Roles: `owner`, `admin`
**Request Body:**
```typescript
{
  user_id?: string;                 // Optional, valid UUID
  email?: string;                   // Optional, valid email
  format?: 'json' | 'csv';         // Default: 'json'
}
```

### POST `/v1/tenants/:id/data-deletion` — Protected + Roles: `owner`, `admin`
**Request Body:**
```typescript
{
  user_id?: string;                 // Optional, valid UUID
  email?: string;                   // Optional, valid email
  reason: string;                   // Required, string
  retention_period?: string;        // Optional, e.g., "30d", "6m", "1y"
}
```

### GET `/v1/tenants/:id/data-retention-status` — Protected + Roles: `owner`, `admin`
**Response:** Implementation specific

## UsersController — base `/users` (`api/src/users/users.controller.ts`)

### GET `/v1/users/me` — Protected (any authenticated)
**Response:**
```typescript
{
  userId: string;
  tenantId: string;
  roles: string[];
}
```

### POST `/v1/users` — Protected + Roles: `admin`
**Request Body:** Implementation specific

### GET `/v1/users` — Protected + Roles: `admin`
**Query Parameters:**
```typescript
{
  q?: string;                       // Optional, search query
  role?: 'owner' | 'admin' | 'member';
  is_active?: boolean;              // Optional, boolean
  page?: number;                    // Default: 1
  limit?: number;                   // Default: 20
}
```

**Response:**
```typescript
{
  items: Array<{
    user_id: string;
    tenant_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    is_active: boolean;
    last_login?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
  }>;
  page: number;
  limit: number;
  total: number;
}
```

### GET `/v1/users/:id` — Protected + Roles: `admin`
**Response:**
```typescript
{
  user_id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  is_active: boolean;
  last_login?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
```

### PATCH `/v1/users/:id` — Protected + Roles: `admin`
**Request Body:**
```typescript
{
  first_name?: string;              // Optional, non-empty string
  last_name?: string;               // Optional, non-empty string
  email?: string;                   // Optional, valid email
}
```

### PATCH `/v1/users/:id/role` — Protected + Roles: `admin`
**Request Body:**
```typescript
{
  role: 'owner' | 'admin' | 'member';
}
```

### DELETE `/v1/users/:id` — Protected + Roles: `admin`
**Response:**
```typescript
{
  deleted: boolean;
}
```

## WorkspacesController — base `/workspaces` (`api/src/workspaces/workspaces.controller.ts`)

### POST `/v1/workspaces` — Protected
**Request Body:**
```typescript
{
  name: string;                     // Required, non-empty string
  description?: string;             // Optional, string
}
```

**Response:**
```typescript
{
  workspace_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: Date;
}
```

### GET `/v1/workspaces` — Protected
**Query Parameters:**
```typescript
{
  offset?: number;                  // Optional, default: 0
  limit?: number;                   // Optional, default: 10
}
```

### GET `/v1/workspaces/admin` — Protected + Roles: `admin`
**Response:** Array of workspaces

### GET `/v1/workspaces/:id` — Protected + WorkspaceMemberGuard
**Response:**
```typescript
{
  workspace_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: Date;
}
```

### PATCH `/v1/workspaces/:id` — Protected + WorkspaceMemberGuard + WorkspaceRoleGuard + Roles: `owner`
**Request Body:**
```typescript
{
  name?: string;                    // Optional, non-empty string
  description?: string;             // Optional, string
}
```

### DELETE `/v1/workspaces/:id` — Protected + WorkspaceMemberGuard + WorkspaceRoleGuard + Roles: `owner`
**Response:** Implementation specific

### POST `/v1/workspaces/:id/members` — Protected
**Request Body:**
```typescript
{
  userId: string;                   // Required, valid UUID
  role: 'admin' | 'member';        // Required, enum
}
```

### DELETE `/v1/workspaces/:id/members/:memberId` — Protected
**Response:** Implementation specific

### GET `/v1/workspaces/:id/members` — Protected + WorkspaceMemberGuard
**Response:**
```typescript
{
  tenant_id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}
```

## ProjectsController — base `/projects` (`api/src/projects/projects.controller.ts`)

### POST `/v1/projects` — Protected + WorkspaceMemberGuard
**Request Body:**
```typescript
{
  name: string;                     // Required, 1-160 characters
  workspace_id: string;             // Required, valid UUID
  description?: string;             // Optional, max 2000 characters
  visibility?: 'private' | 'workspace' | 'tenant'; // Default: 'private'
}
```

**Response:**
```typescript
{
  project_id: string;
  workspace_id: string | null;
  name: string;
  description?: string | null;
  visibility: 'private' | 'workspace' | 'tenant';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
```

### GET `/v1/projects` — Protected
**Query Parameters:**
```typescript
{
  q?: string;                       // Optional, search query
  workspace_id?: string;            // Optional, valid UUID
  page?: number;                    // Default: 1, min: 1
  limit?: number;                   // Default: 20, min: 1
  sort?: 'name' | 'created_at';    // Default: 'created_at'
}
```

**Response:**
```typescript
{
  items: Array<{
    project_id: string;
    workspace_id: string | null;
    name: string;
    description?: string | null;
    visibility: 'private' | 'workspace' | 'tenant';
    created_by: string;
    created_at: Date;
    updated_at: Date;
  }>;
  page: number;
  limit: number;
  total: number;
}
```

### GET `/v1/projects/admin` — Protected + Roles: `admin`
**Response:** Array of projects with pagination

### GET `/v1/projects/:id` — Protected
**Response:**
```typescript
{
  project_id: string;
  workspace_id: string | null;
  name: string;
  description?: string | null;
  visibility: 'private' | 'workspace' | 'tenant';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
```

### PATCH `/v1/projects/:id` — Protected
**Request Body:**
```typescript
{
  name?: string;                    // Optional, 1-160 characters
  description?: string;             // Optional, max 2000 characters
  workspace_id?: string;            // Optional, valid UUID
  visibility?: 'private' | 'workspace' | 'tenant';
}
```

### DELETE `/v1/projects/:id` — Protected
**Response:** Implementation specific

## TasksController — base `/projects/:projectId/tasks` (`api/src/tasks/tasks.controller.ts`)

### POST `/v1/projects/:projectId/tasks` — Protected
**Request Body:**
```typescript
{
  title: string;                    // Required, 1-240 characters
  description?: string;             // Optional, max 4000 characters
  status?: 'todo' | 'in_progress' | 'done' | 'archived'; // Default: 'todo'
  priority?: 'low' | 'medium' | 'high' | 'critical';     // Default: 'low'
  assigned_to?: string;             // Optional, valid UUID
  start_date?: string;              // Optional, ISO date string
  due_date?: string;                // Optional, ISO date string
  estimate_minutes?: number;        // Optional, 1-10080 (1 week max)
}
```

**Response:**
```typescript
{
  task_id: string;
  project_id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string | null;
  attachments?: Array<{
    key: string;
    filename: string;
    size: number;
    mime_type: string;
  }> | null;
  start_date?: string | null;
  due_date?: string | null;
  estimate_minutes?: number | null;
  created_by: string;
  updated_by?: string | null;
  created_at: Date;
  updated_at: Date;
}
```

### GET `/v1/projects/:projectId/tasks` — Protected
**Query Parameters:** Implementation specific

### GET `/v1/projects/:projectId/tasks/admin` — Protected + Roles: `admin`
**Response:** Array of tasks

### GET `/v1/projects/:projectId/tasks/:id` — Protected
**Response:** Task object as above

### PATCH `/v1/projects/:projectId/tasks/:id` — Protected
**Request Body:**
```typescript
{
  title?: string;                   // Optional, 1-240 characters
  description?: string;             // Optional, max 4000 characters
  status?: 'todo' | 'in_progress' | 'done' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;             // Optional, valid UUID
  start_date?: string;              // Optional, ISO date string
  due_date?: string;                // Optional, ISO date string
  estimate_minutes?: number;        // Optional, 1-10080
}
```

### DELETE `/v1/projects/:projectId/tasks/:id` — Protected
**Response:** Implementation specific

### POST `/v1/projects/:projectId/tasks/:taskId/assign` — Protected
**Request Body:**
```typescript
{
  assigned_to: string;              // Required, valid UUID
}
```

### POST `/v1/projects/:projectId/tasks/:taskId/attachments` — Protected
**Request Body:** Implementation specific

### DELETE `/v1/projects/:projectId/tasks/:taskId/attachments/:attachmentId` — Protected
**Response:** Implementation specific

## CommentsController — base `/tasks/:taskId/comments` (`api/src/comments/comments.controller.ts`)

### POST `/v1/tasks/:taskId/comments` — Protected
**Request Body:**
```typescript
{
  text: string;                     // Required, 1-5000 characters
}
```

**Response:**
```typescript
{
  comment_id: string;
  task_id: string;
  tenant_id: string;
  text: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
```

### GET `/v1/tasks/:taskId/comments` — Protected
**Query Parameters:**
```typescript
{
  page?: number;                    // Default: 1, min: 1
  limit?: number;                   // Default: 20, min: 1
}
```

**Response:**
```typescript
{
  items: Array<{
    comment_id: string;
    task_id: string;
    tenant_id: string;
    text: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
  }>;
  page: number;
  limit: number;
  total: number;
}
```

### GET `/v1/tasks/:taskId/comments/admin` — Protected + Roles: `admin`
**Response:** Array of comments

### GET `/v1/tasks/:taskId/comments/:id` — Protected
**Response:** Comment object as above

### PATCH `/v1/tasks/:taskId/comments/:id` — Protected
**Request Body:**
```typescript
{
  text: string;                     // Required, 1-5000 characters
}
```

### DELETE `/v1/tasks/:taskId/comments/:id` — Protected
**Response:** Implementation specific

## InvitesController — base `/invites` (`api/src/invites/invites.controller.ts`)

### POST `/v1/invites` — Protected + WorkspaceRoleGuard + Roles: `owner`, `admin`
**Request Body:**
```typescript
{
  email: string;                    // Required, valid email
  workspaceId: string;              // Required, valid UUID
  role: 'admin' | 'member';         // Required, enum
}
```

**Response:**
```typescript
{
  invite_id: string;
  tenant_id: string;
  email: string;
  resource_type: string;
  resource_id: string;
  role: string;
  status: string;
  invited_by: string;
  expires_at: Date;
  accepted_at?: Date;
  declined_at?: Date;
  created_at: Date;
}
```

### GET `/v1/invites` — Protected
**Query Parameters:**
```typescript
{
  offset?: number;                  // Optional, default: 0
  limit?: number;                   // Optional, default: 10
  status?: 'pending' | 'accepted' | 'declined';
}
```

### GET `/v1/invites/:id` — Protected
**Response:** Invite object as above

### PATCH `/v1/invites/:id` — Protected
**Request Body:**
```typescript
{
  status?: 'pending' | 'accepted' | 'declined';
  role?: 'admin' | 'member';
}
```

### DELETE `/v1/invites/:id` — Protected + InviteRoleGuard + Roles: `owner`, `admin`
**Response:** Implementation specific

### POST `/v1/invites/:id/accept` — Protected
**Response:** Implementation specific

### POST `/v1/invites/:id/decline` — Protected
**Response:** Implementation specific

## FilesController — base `/files` (`api/src/files/files.controller.ts`)

### POST `/v1/files/presign` — Protected
**Request Body:**
```typescript
{
  fileName: string;                 // Required, string
  contentType: string;              // Required, string
  size: number;                     // Required, 1-100MB
  taskId?: string;                  // Optional, valid UUID
}
```

**Response:**
```typescript
{
  url: string;                      // Presigned upload URL
  bucket: string;                   // S3 bucket name
  key: string;                      // S3 object key
  expiresIn: number;                // Expiration time in seconds
}
```

### POST `/v1/files/scan-callback` — Protected
**Request Body:**
```typescript
{
  bucket: string;                   // Required, string
  key: string;                      // Required, string
  clean: boolean;                   // Required, boolean
  taskId?: string;                  // Optional, valid UUID
  filename?: string;                // Optional, string
  size?: number;                    // Optional, number
  mime?: string;                    // Optional, string
  tenantId?: string;                // Optional, string
}
```

**Response:**
```typescript
{
  recorded: boolean;
  attachedToTask?: string;
  key?: string;
}
```

## ActivityLogsController — base `/activity` (`api/src/activity-logs/activity-logs.controller.ts`)

### GET `/v1/activity` — Protected + Roles: `admin`, `owner`
**Response:**
```typescript
{
  log_id: string;
  tenant_id: string;
  actor_id: string;
  actor: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login?: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  resource_type: string;
  resource_id: string;
  action: string;
  data?: Record<string, any> | null;
  created_at: Date;
}
```

---

## Common DTOs and Types

### Pagination
```typescript
// Standard pagination
{
  page?: number;                    // Default: 1, min: 1
  limit?: number;                   // Default: 20, min: 1, max: 100
}

// Cursor pagination
{
  cursor?: string;                  // Base64 encoded cursor
  limit?: number;                   // Default: 20, min: 1, max: 100
}

// Paginated response
{
  items: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

### File Upload
```typescript
{
  filename: string;
  size: number;                     // 1-100MB
  mime_type: string;
}
```

### Error Responses
```typescript
{
  message: string;
  error?: string;
  statusCode: number;
}
```

---

## Notes for Frontend Developers

1. **Authentication**: All protected endpoints require a valid JWT token in the Authorization header: `Authorization: Bearer <token>`
2. **Tenant Context**: The tenant ID is automatically extracted from the JWT token
3. **Validation**: All request bodies are validated using class-validator decorators
4. **File Uploads**: Use the presign endpoint to get upload URLs for S3
5. **Pagination**: Most list endpoints support standard pagination with page/limit parameters
6. **Rate Limiting**: Public endpoints have stricter rate limits than authenticated ones
7. **Error Handling**: Check the status code and error message in responses
8. **Date Formats**: All dates are returned in ISO 8601 format
9. **UUIDs**: All IDs are UUIDs (version 4)
10. **Enums**: Use the exact string values for enum fields

## Testing

- Use the `/v1/docs` endpoint (Swagger) for interactive API testing
- Test endpoints with proper authentication tokens
- Respect rate limiting during development
- Use the health check endpoints to verify service status
