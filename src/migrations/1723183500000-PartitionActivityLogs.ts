import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartitionActivityLogs1723183500000 implements MigrationInterface {
  name = 'PartitionActivityLogs1723183500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create partitioned activity_logs table
    await queryRunner.query(`
      -- Rename existing table
      ALTER TABLE activity_logs RENAME TO activity_logs_old;
    `);

    // Drop old indexes to avoid name conflicts with new partitioned table indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_activity_logs_tenant;
      DROP INDEX IF EXISTS idx_activity_logs_tenant_resource;
      DROP INDEX IF EXISTS idx_activity_logs_tenant_created;
    `);

    await queryRunner.query(`
      -- Create new partitioned table
      CREATE TABLE activity_logs (
        log_id uuid DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL,
        actor_id uuid NOT NULL,
        resource_type varchar(64) NOT NULL,
        resource_id uuid NOT NULL,
        action varchar(64) NOT NULL,
        data jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_activity_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) PARTITION BY RANGE (created_at);
    `);

    // Create monthly partitions for the current year
    const currentYear = new Date().getFullYear();
    const _currentMonth = new Date().getMonth() + 1;

    for (let month = 1; month <= 12; month++) {
      const startDate = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
      const endDate =
        month === 12
          ? `${currentYear + 1}-01-01`
          : `${currentYear}-${(month + 1).toString().padStart(2, '0')}-01`;

      await queryRunner.query(`
        CREATE TABLE activity_logs_${currentYear}_${month.toString().padStart(2, '0')} 
        PARTITION OF activity_logs 
        FOR VALUES FROM ('${startDate}') TO ('${endDate}');
      `);
    }

    // Create next year's first quarter partitions
    for (let month = 1; month <= 3; month++) {
      const nextYear = currentYear + 1;
      const startDate = `${nextYear}-${month.toString().padStart(2, '0')}-01`;
      const endDate =
        month === 3
          ? `${nextYear}-04-01`
          : `${nextYear}-${(month + 1).toString().padStart(2, '0')}-01`;

      await queryRunner.query(`
        CREATE TABLE activity_logs_${nextYear}_${month.toString().padStart(2, '0')} 
        PARTITION OF activity_logs 
        FOR VALUES FROM ('${startDate}') TO ('${endDate}');
      `);
    }

    // Migrate existing data
    await queryRunner.query(`
      INSERT INTO activity_logs 
      SELECT * FROM activity_logs_old;
    `);

    // Create indexes on partitioned table
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_tenant_resource ON activity_logs(tenant_id, resource_type, resource_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_tenant_created ON activity_logs(tenant_id, created_at)`,
    );

    // Drop old table
    await queryRunner.query(`DROP TABLE activity_logs_old CASCADE`);

    // Create function to automatically create new partitions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
      RETURNS void AS $$
      DECLARE
        partition_name text;
        end_date date;
      BEGIN
        partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
        end_date := start_date + interval '1 month';
        
        EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                      partition_name, table_name, start_date, end_date);
        
        EXECUTE format('CREATE INDEX %I ON %I(tenant_id)', 
                      'idx_' || partition_name || '_tenant', partition_name);
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partition function
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS create_monthly_partition(text, date)`,
    );

    // Create regular table
    await queryRunner.query(`
      CREATE TABLE activity_logs_new (
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
      );
    `);

    // Migrate data back
    await queryRunner.query(`
      INSERT INTO activity_logs_new 
      SELECT * FROM activity_logs;
    `);

    // Drop partitioned table
    await queryRunner.query(`DROP TABLE activity_logs CASCADE`);

    // Rename back
    await queryRunner.query(
      `ALTER TABLE activity_logs_new RENAME TO activity_logs`,
    );

    // Recreate indexes
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_tenant_resource ON activity_logs(tenant_id, resource_type, resource_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_tenant_created ON activity_logs(tenant_id, created_at)`,
    );
  }
}
