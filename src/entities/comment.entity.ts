import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity({ name: 'comments' })
@Index(['tenant_id'])
@Index(['tenant_id', 'task_id'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  comment_id!: string;

  @Column('uuid')
  task_id!: string;

  @ManyToOne(() => Task, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', referencedColumnName: 'task_id' })
  task!: Task;

  @Column('uuid')
  tenant_id!: string;

  @ManyToOne(() => Tenant, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  text!: string;

  @Column('uuid')
  created_by!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by', referencedColumnName: 'user_id' })
  creator!: User;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
