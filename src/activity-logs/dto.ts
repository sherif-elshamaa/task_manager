import { ApiProperty } from '@nestjs/swagger';

export class ActivityLogActorDto {
  @ApiProperty({ description: 'User ID' })
  user_id!: string;

  @ApiProperty({ description: 'First name' })
  first_name!: string;

  @ApiProperty({ description: 'Last name' })
  last_name!: string;

  @ApiProperty({ description: 'Email address' })
  email!: string;

  @ApiProperty({ description: 'User role', example: 'member' })
  role!: string;

  @ApiProperty({ description: 'Whether the user is active' })
  is_active!: boolean;

  @ApiProperty({ description: 'Last login timestamp', required: false })
  last_login?: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at!: Date;
}

export class ActivityLogResponseDto {
  @ApiProperty({ description: 'Log ID' })
  log_id!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenant_id!: string;

  @ApiProperty({ description: 'Actor user ID' })
  actor_id!: string;

  @ApiProperty({ description: 'Actor details', type: ActivityLogActorDto })
  actor!: ActivityLogActorDto;

  @ApiProperty({ description: 'Resource type', example: 'task' })
  resource_type!: string;

  @ApiProperty({ description: 'Resource ID' })
  resource_id!: string;

  @ApiProperty({ description: 'Action performed', example: 'created' })
  action!: string;

  @ApiProperty({
    description: 'Additional data',
    required: false,
    type: Object,
  })
  data?: Record<string, any> | null;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at!: Date;
}
