import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { UserBasicDto } from '../shared/expanded-response.dto';

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
  @ApiProperty({ description: 'Workspace ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  workspace_id!: string;

  @ApiProperty({ description: 'Workspace name', example: 'Development Team' })
  name!: string;

  @ApiPropertyOptional({ description: 'Workspace description', example: 'Main development workspace' })
  description?: string;

  @ApiProperty({ description: 'Is workspace archived', example: false })
  is_archived!: boolean;

  @ApiProperty({ type: UserBasicDto, description: 'User who created this workspace' })
  creator!: UserBasicDto;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T10:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T16:45:00.000Z' })
  updated_at!: string;

  @ApiPropertyOptional({ description: 'Number of members in workspace', example: 12 })
  member_count?: number;

  @ApiPropertyOptional({ description: 'Number of projects in workspace', example: 5 })
  project_count?: number;
}

export class WorkspaceMemberResponseDto {
  @ApiProperty({ type: UserBasicDto, description: 'User information' })
  user!: UserBasicDto;

  @ApiProperty({ description: 'Member role in workspace', example: 'member', enum: ['owner', 'admin', 'member'] })
  role!: string;

  @ApiProperty({ description: 'When the user joined the workspace', example: '2024-01-10T09:00:00.000Z' })
  joined_at!: string;
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
