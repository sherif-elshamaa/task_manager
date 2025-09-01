import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToWorkspaceMembers1723771500000
  implements MigrationInterface
{
  name = 'AddTenantIdToWorkspaceMembers1723771500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_members" ADD "tenant_id" uuid`,
    );
    await queryRunner.query(`
            UPDATE "workspace_members"
            SET "tenant_id" = "workspaces"."tenant_id"
            FROM "workspaces"
            WHERE "workspace_members"."workspace_id" = "workspaces"."workspace_id"
        `);
    await queryRunner.query(
      `ALTER TABLE "workspace_members" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );
    await queryRunner.query(`
            ALTER TABLE "workspace_members"
            ADD CONSTRAINT "FK_workspace_members_tenant_id"
            FOREIGN KEY ("tenant_id")
            REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_workspace_members_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP COLUMN "tenant_id"`,
    );
  }
}
