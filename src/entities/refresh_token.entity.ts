import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'refresh_tokens' })
@Index(['user_id'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Virtual alias used by tests and services
  // Not a DB column; provided for compatibility with specs
  get token_id(): string {
    return this.id;
  }

  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user!: User;

  @Column('uuid')
  tenant_id!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  token_hash!: string;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;
}
