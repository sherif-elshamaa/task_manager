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
import { User } from './user.entity';
import { Comment } from './comment.entity';

@Entity({ name: 'tasks' })
@Index(['tenant_id'])
@Index(['tenant_id', 'project_id'])
@Index(['tenant_id', 'project_id', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  task_id!: string;

  @Column('uuid')
  project_id!: string;

  @ManyToOne(() => Project, (p) => p.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  project!: Project;

  @Column('uuid')
  tenant_id!: string;

  @ManyToOne(() => Tenant, (t) => t.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 240 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 24, default: 'todo' })
  status!: 'todo' | 'in_progress' | 'done' | 'archived';

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority!: 'low' | 'medium' | 'high' | 'critical';

  @Column('uuid', { nullable: true })
  assigned_to!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to', referencedColumnName: 'user_id' })
  assignee!: User | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: Array<{
    key: string;
    filename: string;
    size: number;
    mime_type: string;
  }> | null;

  @Column({ type: 'date', nullable: true })
  start_date?: string | null;

  @Column({ type: 'date', nullable: true })
  due_date?: string | null;

  @Column({ type: 'integer', nullable: true })
  estimate_minutes?: number | null;

  @Column('uuid')
  created_by!: string;

  @Column('uuid', { nullable: true })
  updated_by?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by', referencedColumnName: 'user_id' })
  updater!: User | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Comment, (c) => c.task)
  comments?: Comment[];
}
