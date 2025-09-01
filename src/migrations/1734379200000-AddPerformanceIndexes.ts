import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1734379200000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1734379200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add performance indexes for common query patterns

    // Tasks table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_tenant_assigned_to"
      ON "tasks"("tenant_id", "assigned_to")
      WHERE "assigned_to" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_tenant_status_priority"
      ON "tasks"("tenant_id", "status", "priority")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_tenant_due_date"
      ON "tasks"("tenant_id", "due_date")
      WHERE "due_date" IS NOT NULL
    `);

    // Activity logs table indexes for audit queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_activity_logs_tenant_created_at"
      ON "activity_logs"("tenant_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_activity_logs_tenant_actor"
      ON "activity_logs"("tenant_id", "actor_id", "created_at" DESC)
    `);

    // Users table index for email lookups
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_tenant_email"
      ON "users"("tenant_id", "email")
    `);

    // Comments table index for task comments
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comments_tenant_task_created_at"
      ON "comments"("tenant_id", "task_id", "created_at" DESC)
    `);

    // Projects table index for workspace projects
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_tenant_workspace_created_at"
      ON "projects"("tenant_id", "workspace_id", "created_at" DESC)
      WHERE "workspace_id" IS NOT NULL
    `);

    // Refresh tokens cleanup index
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_refresh_tokens_expires_at"
      ON "refresh_tokens"("expires_at")
      WHERE "revoked" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the indexes in reverse order
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_refresh_tokens_expires_at"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_tenant_workspace_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_comments_tenant_task_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_users_tenant_email"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_activity_logs_tenant_actor"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_activity_logs_tenant_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_tenant_due_date"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_tenant_status_priority"
    `);
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_tenant_assigned_to"
    `);
  }
}
