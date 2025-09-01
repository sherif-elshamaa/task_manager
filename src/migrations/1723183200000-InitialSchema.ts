import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1723183200000 implements MigrationInterface {
  name = 'InitialSchema1723183200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        plan varchar(64) NOT NULL DEFAULT 'free',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL,
        first_name varchar(80) NOT NULL,
        last_name varchar(80) NOT NULL,
        email varchar(255) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role varchar(32) NOT NULL,
        last_login timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        workspace_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL,
        name varchar(120) NOT NULL,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_workspaces_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_workspaces_tenant ON workspaces(tenant_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role varchar(32) NOT NULL,
        joined_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (workspace_id, user_id),
        CONSTRAINT fk_wsm_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
        CONSTRAINT fk_wsm_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL,
        workspace_id uuid NULL,
        name varchar(160) NOT NULL,
        description text NULL,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        task_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        title varchar(240) NOT NULL,
        description text NULL,
        status varchar(24) NOT NULL DEFAULT 'todo',
        priority varchar(16) NOT NULL DEFAULT 'med',
        assigned_to uuid NULL,
        start_date date NULL,
        due_date date NULL,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        CONSTRAINT fk_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tasks_tenant_project ON tasks(tenant_id, project_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comments (
        comment_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        text text NOT NULL,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CONSTRAINT fk_comments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_comments_tenant ON comments(tenant_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS comments`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_tenant`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS workspace_members`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_workspaces_tenant`);
    await queryRunner.query(`DROP TABLE IF EXISTS workspaces`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_tenant`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
