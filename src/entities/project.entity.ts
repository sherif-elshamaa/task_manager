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
import { Workspace } from './workspace.entity';
import { Task } from './task.entity';

@Entity({ name: 'projects' })
@Index(['tenant_id'])
@Index(['tenant_id', 'workspace_id'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  project_id!: string;

  @Column('uuid')
  tenant_id!: string;

  @ManyToOne(() => Tenant, (t) => t.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'tenant_id' })
  tenant!: Tenant;

  @Column('uuid', { nullable: true })
  workspace_id!: string | null;

  @ManyToOne(() => Workspace, (w) => w.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id', referencedColumnName: 'workspace_id' })
  workspace!: Workspace | null;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'private' })
  visibility!: 'private' | 'workspace' | 'tenant';

  @Column('uuid')
  created_by!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Task, (t) => t.project)
  tasks?: Task[];
}
