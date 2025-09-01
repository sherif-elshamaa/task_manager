import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteSchema1723183400000 implements MigrationInterface {
  name = 'CompleteSchema1723183400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to existing tables
    await queryRunner.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS metadata jsonb,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE workspaces 
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS visibility varchar(32) DEFAULT 'private',
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS attachments jsonb,
      ADD COLUMN IF NOT EXISTS estimate_minutes integer,
      ADD COLUMN IF NOT EXISTS updated_by uuid,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
      ALTER COLUMN status TYPE varchar(24),
      ALTER COLUMN priority TYPE varchar(16)
    `);

    await queryRunner.query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    // Update task status and priority constraints
    await queryRunner.query(`
      ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS chk_tasks_status,
      DROP CONSTRAINT IF EXISTS chk_tasks_priority
    `);

    await queryRunner.query(`
      ALTER TABLE tasks 
      ADD CONSTRAINT chk_tasks_status 
      CHECK (status IN ('todo', 'in_progress', 'done', 'archived'))
    `);

    await queryRunner.query(`
      ALTER TABLE tasks 
      ADD CONSTRAINT chk_tasks_priority 
      CHECK (priority IN ('low', 'medium', 'high', 'critical'))
    `);

    // Create ActivityLog table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        log_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL,
        actor_id uuid NOT NULL,
        resource_type varchar(64) NOT NULL,
        resource_id uuid NOT NULL,
        action varchar(64) NOT NULL,
        data jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_activity_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create indexes for ActivityLog
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_resource ON activity_logs(tenant_id, resource_type, resource_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created ON activity_logs(tenant_id, created_at)`,
    );

    // Create additional indexes for existing tables
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_archived ON workspaces(tenant_id, is_archived)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_projects_tenant_workspace ON projects(tenant_id, workspace_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tasks_tenant_project_status ON tasks(tenant_id, project_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_comments_tenant_task ON comments(tenant_id, task_id)`,
    );

    // Add foreign key constraints for updated_by
    await queryRunner.query(`
      ALTER TABLE tasks 
      ADD CONSTRAINT fk_tasks_updater 
      FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop ActivityLog table
    await queryRunner.query(`DROP TABLE IF EXISTS activity_logs CASCADE`);

    // Remove foreign key constraints
    await queryRunner.query(`
      ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS fk_tasks_updater
    `);

    // Remove check constraints
    await queryRunner.query(`
      ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS chk_tasks_status,
      DROP CONSTRAINT IF EXISTS chk_tasks_priority
    `);

    // Remove columns from tasks
    await queryRunner.query(`
      ALTER TABLE tasks 
      DROP COLUMN IF EXISTS attachments,
      DROP COLUMN IF EXISTS estimate_minutes,
      DROP COLUMN IF EXISTS updated_by,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Remove columns from comments
    await queryRunner.query(`
      ALTER TABLE comments 
      DROP COLUMN IF EXISTS updated_at
    `);

    // Remove columns from projects
    await queryRunner.query(`
      ALTER TABLE projects 
      DROP COLUMN IF EXISTS visibility,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Remove columns from workspaces
    await queryRunner.query(`
      ALTER TABLE workspaces 
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS is_archived,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Remove columns from users
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS metadata,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Remove columns from tenants
    await queryRunner.query(`
      ALTER TABLE tenants 
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_workspaces_tenant_archived`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_projects_tenant_workspace`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tasks_tenant_project_status`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_comments_tenant_task`);
  }
}
