import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { User } from './user.entity';

@Entity({ name: 'workspace_members' })
@Index(['tenant_id', 'workspace_id', 'user_id'], { unique: true })
export class WorkspaceMember {
  @PrimaryColumn('uuid')
  tenant_id!: string;

  @PrimaryColumn('uuid')
  workspace_id!: string;

  @PrimaryColumn('uuid')
  user_id!: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id', referencedColumnName: 'workspace_id' })
  workspace!: Workspace;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 32 })
  role!: string;

  @CreateDateColumn()
  joined_at!: Date;
}
