import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'invites' })
@Index(['tenant_id'])
@Index(['email'])
@Index(['status'])
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  invite_id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  invited_by!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 32 })
  resource_type!: 'workspace' | 'project';

  @Column('uuid')
  resource_id!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: 'admin' | 'member';

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'accepted' | 'declined';

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  declined_at?: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
