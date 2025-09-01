import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Project } from './project.entity';

@Entity({ name: 'workspaces' })
@Index(['tenant_id'])
@Index(['tenant_id', 'is_archived'])
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  workspace_id!: string;

  @Column('uuid')
  tenant_id!: string;

  @ManyToOne(() => Tenant, (t) => t.workspaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', default: false })
  is_archived!: boolean;

  @Column('uuid')
  created_by!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Project, (p) => p.workspace)
  projects?: Project[];
}
