import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name', example: 'Marketing Team' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Workspace description',
    example: 'Team workspace for marketing projects',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkspaceDto {
  @ApiProperty({
    description: 'Workspace name',
    example: 'Marketing Team',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Workspace description',
    example: 'Team workspace for marketing projects',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add', example: 'uuid-here' })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: 'Member role',
    enum: ['admin', 'member'],
    example: 'member',
  })
  @IsEnum(['admin', 'member'])
  role!: 'admin' | 'member';
}

export class WorkspaceResponseDto {
  @ApiProperty({ description: 'Workspace ID' })
  workspace_id!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenant_id!: string;

  @ApiProperty({ description: 'Workspace name' })
  name!: string;

  @ApiProperty({ description: 'Workspace description', required: false })
  description?: string;

  @ApiProperty({ description: 'Created by user ID' })
  created_by!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at!: Date;
}

export class WorkspaceMemberResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenant_id!: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspace_id!: string;

  @ApiProperty({ description: 'User ID' })
  user_id!: string;

  @ApiProperty({ description: 'Member role' })
  role!: string;

  @ApiProperty({ description: 'Joined at timestamp' })
  joined_at!: Date;
}

export class ListWorkspacesQueryDto {
  @ApiProperty({
    description: 'Offset for pagination',
    required: false,
    example: 0,
  })
  @IsOptional()
  offset?: number;

  @ApiProperty({
    description: 'Limit for pagination',
    required: false,
    example: 10,
  })
  @IsOptional()
  limit?: number;
}
