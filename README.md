# Task Manager API

A production-ready, multi-tenant task management API built with NestJS, TypeORM, and PostgreSQL. This API provides comprehensive project and task management capabilities with enterprise-grade security, scalability, and observability features.

## 🚀 Features

- **Multi-tenancy**: Complete tenant isolation with shared schema architecture
- **Authentication & Authorization**: JWT-based auth with refresh token rotation and RBAC
- **Project Management**: Create, organize, and manage projects and workspaces
- **Task Management**: Full CRUD operations with status tracking and assignments
- **Standardized Pagination**: Consistent pagination across all endpoints with cursor support
- **File Uploads**: S3-compatible file storage with presigned URLs
- **Background Processing**: BullMQ-powered job queues for emails and notifications
- **Activity Logging**: Comprehensive audit trails for all operations
- **API Documentation**: OpenAPI/Swagger documentation
- **Health Monitoring**: Built-in health checks and system status endpoints
- **Security**: Rate limiting, CORS, helmet, and input validation
- **Testing**: Comprehensive test suite with integration tests
- **Performance Optimized**: Database indexes and query optimization for production workloads

## ✨ Recent Improvements (v2024.12)

### 🔧 **Critical Bug Fixes**
- Fixed duplicate environment variable configurations
- Corrected database entity relationships and indexes
- Resolved TypeORM production configuration issues
- Cleaned up dead code and improved code quality

### ⚡ **Performance Enhancements**
- Added 9 strategic database indexes for common query patterns:
  - Task filtering by tenant, assignee, status, priority, and due date
  - Activity logs for audit queries
  - User email lookups and comment retrieval
  - Project workspace queries and refresh token cleanup
- Optimized TypeORM settings for production environments
- Enhanced query execution monitoring with timeout controls

### 📊 **Pagination System Overhaul**
- Implemented standardized pagination across all endpoints
- Added support for both page-based and cursor-based pagination
- Consistent response format: `{ data: [...], pagination: {...} }`
- Increased default page size from 10 to 20 items for better UX

### 🐳 **Docker & Security Improvements**
- Enhanced multi-stage Docker build process
- Added proper non-root user security in containers
- Improved health check configuration
- Comprehensive `.dockerignore` for optimized build context
- Better container startup time and resource usage

### 🧪 **Testing & Quality**
- All 51 E2E tests passing successfully
- Enhanced test coverage for pagination and error handling
- Improved test reliability and performance
- Fixed test compatibility with new pagination system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │   Background    │
│                 │    │                 │    │    Workers     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │   S3 Storage    │
│   (Primary)     │    │   (Cache/Queue) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Read Replica)│
└─────────────────┘
```

## 🛠️ Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 with TypeORM
- **Cache/Queue**: Redis with BullMQ
- **File Storage**: AWS S3 (or compatible)
- **Authentication**: JWT with refresh tokens
- **Validation**: class-validator with global pipes
- **Documentation**: OpenAPI/Swagger
- **Testing**: Jest with supertest
- **Containerization**: Docker with docker-compose
- **Security**: Helmet, CORS, rate limiting

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)
- AWS CLI (for S3 operations)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd task_manager/api
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp config.env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/task_manager

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Redis
REDIS_URL=redis://localhost:6379

# AWS S3
S3_BUCKET_NAME=task-manager-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

### 3. Database Setup

#### Option A: Using Docker (Recommended for development)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose ps
```

#### Option B: Local Installation

Install PostgreSQL and Redis locally, then create the database:

```sql
CREATE DATABASE task_manager;
```

### 4. Run Migrations

```bash
# Generate migration (if needed)
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the application is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/v1/docs`
- **OpenAPI JSON**: `http://localhost:3000/v1/docs-json`

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## 🔧 Development

### Project Structure

```
src/
├── auth/              # Authentication & authorization
├── users/             # User management
├── tenants/           # Tenant management
├── workspaces/        # Workspace management
├── projects/          # Project management
├── tasks/             # Task management
├── comments/          # Comment system
├── invites/           # User invitation system
├── activity-logs/     # Audit logging
├── jobs/              # Background job processing
├── shared/            # Shared utilities & guards
├── entities/          # Database entities
└── migrations/        # Database migrations
```

### Adding New Features

1. **Create Entity**: Define in `src/entities/`
2. **Create Module**: Implement in appropriate feature module
3. **Create Service**: Business logic in service layer
4. **Create Controller**: HTTP endpoints with validation
5. **Add Tests**: Unit and integration tests
6. **Update Documentation**: Add OpenAPI decorators

### Database Migrations

```bash
# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate

# Revert migration (if needed)
npm run typeorm migration:revert
```

## 🚀 Production Deployment

### 1. Environment Configuration

Set production environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-production-jwt-secret
REDIS_URL=redis://redis-host:6379
```

### 2. Database Setup

- Use managed PostgreSQL service (AWS RDS, GCP Cloud SQL)
- Enable connection pooling
- Configure read replicas for scaling
- Set up automated backups

### 3. Redis Setup

- Use managed Redis service (AWS ElastiCache, GCP Memorystore)
- Configure persistence and backup
- Set up monitoring and alerts

### 4. S3 Configuration

- Create S3 bucket with proper permissions
- Configure CORS for file uploads
- Set up lifecycle policies
- Enable versioning for data protection

### 5. Container Deployment

```bash
# Build production image
docker build -t task-manager-api:latest .

# Run with production config
docker run -d \
  --name task-manager-api \
  -p 3000:3000 \
  --env-file .env.production \
  task-manager-api:latest
```

### 6. Load Balancer & Scaling

- Deploy behind load balancer (AWS ALB, GCP LB)
- Use container orchestration (Kubernetes, ECS)
- Implement horizontal scaling based on metrics
- Set up auto-scaling policies

## 📊 Monitoring & Observability

### Health Checks

- **Basic Health**: `GET /v1/health`
- **Detailed Health**: `GET /v1/health/detailed`
- **Application Info**: `GET /v1/info`

### Metrics & Logging

- Structured JSON logging
- Request/response correlation IDs
- Performance metrics collection
- Error tracking and alerting

### Recommended Tools

- **APM**: New Relic, DataDog, or AWS X-Ray
- **Logging**: ELK Stack, Loki, or cloud logging
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry or similar

## 🔒 Security Features

- JWT-based authentication with short-lived tokens
- Refresh token rotation and revocation
- Role-based access control (RBAC)
- Tenant isolation at database level
- Rate limiting and DDoS protection
- Input validation and sanitization
- CORS configuration
- Security headers (Helmet)
- SQL injection protection (TypeORM)

## 📈 Performance & Scaling

### Database Optimization

- Proper indexing on tenant_id columns
- Query optimization with TypeORM
- Connection pooling configuration
- Read replica usage for heavy reads

### Caching Strategy

- Redis for session storage
- Query result caching
- File metadata caching
- Rate limiting storage

### Horizontal Scaling

- Stateless API design
- Load balancer distribution
- Database read replicas
- Background job worker scaling

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall settings

2. **Redis Connection Failed**
   - Verify Redis service is running
   - Check REDIS_URL format
   - Verify network connectivity

3. **JWT Errors**
   - Check JWT_SECRET is set
   - Verify token expiration settings
   - Check clock synchronization

4. **File Upload Issues**
   - Verify S3 credentials
   - Check bucket permissions
   - Verify CORS configuration

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run start:dev
```

### Database Debugging

```bash
# Enable SQL logging
DB_LOGGING=true npm run start:dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Run test suite
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the API documentation
- Review the troubleshooting section
- Contact the development team

---

**Built with ❤️ using NestJS and modern web technologies**
