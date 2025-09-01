import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'activity_logs' })
@Index(['tenant_id'])
@Index(['tenant_id', 'resource_type', 'resource_id'])
@Index(['tenant_id', 'created_at'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  log_id!: string;

  @Column('uuid')
  tenant_id!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'tenant_id' })
  tenant!: Tenant;

  @Column('uuid')
  actor_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id', referencedColumnName: 'user_id' })
  actor!: User;

  @Column({ type: 'varchar', length: 64 })
  resource_type!: string;

  @Column('uuid')
  resource_id!: string;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any> | null;

  @CreateDateColumn()
  created_at!: Date;
}
