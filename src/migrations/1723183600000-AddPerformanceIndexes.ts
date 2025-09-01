import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1723183600000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1723183600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes for tasks table - most frequently queried fields
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_assigned_to 
      ON tasks(tenant_id, assigned_to) 
      WHERE assigned_to IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_due_date 
      ON tasks(tenant_id, due_date) 
      WHERE due_date IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_status 
      ON tasks(tenant_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_priority 
      ON tasks(tenant_id, priority);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_project_status 
      ON tasks(tenant_id, project_id, status);
    `);

    // Add indexes for activity_logs table - for audit queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_tenant_created_at 
      ON activity_logs(tenant_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_tenant_resource 
      ON activity_logs(tenant_id, resource_type, resource_id);
    `);

    // Add indexes for comments table
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_tenant_task 
      ON comments(tenant_id, task_id, created_at DESC);
    `);

    // Add indexes for workspace_members table
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_tenant_user 
      ON workspace_members(tenant_id, user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_tenant_workspace 
      ON workspace_members(tenant_id, workspace_id);
    `);

    // Add indexes for projects table
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tenant_workspace 
      ON projects(tenant_id, workspace_id);
    `);

    // Add indexes for invites table
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_tenant_status 
      ON invites(tenant_id, status) 
      WHERE status != 'accepted';
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_email_status 
      ON invites(email, status) 
      WHERE status = 'pending';
    `);

    // Add composite index for user search
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_search 
      ON users(tenant_id, first_name, last_name, email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all the indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tasks_tenant_assigned_to;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant_due_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant_priority;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_project_status;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_activity_logs_tenant_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_activity_logs_tenant_resource;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_comments_tenant_task;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_workspace_members_tenant_user;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_workspace_members_tenant_workspace;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_projects_tenant_workspace;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invites_tenant_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invites_email_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_tenant_search;`);
  }
}
