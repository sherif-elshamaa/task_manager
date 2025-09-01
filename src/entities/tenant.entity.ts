import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { Comment } from './comment.entity';

@Entity({ name: 'tenants' })
@Index(['status'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  tenant_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, default: 'free' })
  plan!: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: 'active' | 'suspended' | 'deleted';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => User, (u) => u.tenant)
  users?: User[];
  @OneToMany(() => Workspace, (w) => w.tenant)
  workspaces?: Workspace[];
  @OneToMany(() => Project, (p) => p.tenant)
  projects?: Project[];
  @OneToMany(() => Task, (t) => t.tenant)
  tasks?: Task[];
  @OneToMany(() => Comment, (c) => c.tenant)
  comments?: Comment[];
}
