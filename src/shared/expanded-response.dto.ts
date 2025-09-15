import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Base User Information DTO for nested objects
export class UserBasicDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  user_id!: string;

  @ApiProperty({ example: 'John' })
  first_name!: string;

  @ApiProperty({ example: 'Doe' })
  last_name!: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  email!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: 'member', enum: ['owner', 'admin', 'member'] })
  role!: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' })
  last_login?: string;
}

// Tenant Information DTO for nested objects
export class TenantBasicDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  tenant_id!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name!: string;

  @ApiProperty({ example: 'free', enum: ['free', 'paid'] })
  plan!: string;

  @ApiProperty({ example: 'active', enum: ['active', 'suspended', 'deleted'] })
  status!: string;
}

// Workspace Information DTO for nested objects
export class WorkspaceBasicDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  workspace_id!: string;

  @ApiProperty({ example: 'Development Team' })
  name!: string;

  @ApiPropertyOptional({ example: 'Main development workspace' })
  description?: string;

  @ApiProperty({ example: false })
  is_archived!: boolean;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  created_at!: string;
}

// Project Information DTO for nested objects
export class ProjectBasicDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  project_id!: string;

  @ApiProperty({ example: 'Mobile App Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'iOS and Android mobile application' })
  description?: string;

  @ApiProperty({ example: 'workspace', enum: ['private', 'workspace', 'tenant'] })
  visibility!: string;

  @ApiProperty({ type: WorkspaceBasicDto })
  workspace?: WorkspaceBasicDto;
}

// Task Information DTO for nested objects
export class TaskBasicDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  task_id!: string;

  @ApiProperty({ example: 'Implement user authentication' })
  title!: string;

  @ApiProperty({ example: 'todo', enum: ['todo', 'in_progress', 'done', 'archived'] })
  status!: string;

  @ApiProperty({ example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  priority!: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  due_date?: string;
}

// Full expanded user profile DTO
export class ExpandedUserProfileDto extends UserBasicDto {
  @ApiProperty({ type: TenantBasicDto })
  tenant!: TenantBasicDto;

  @ApiProperty({ example: '2024-01-01T08:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T14:30:00.000Z' })
  updated_at!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { preferences: { theme: 'dark', notifications: true } }
  })
  metadata?: Record<string, any>;
}

// Workspace member with expanded user data
export class ExpandedWorkspaceMemberDto {
  @ApiProperty({ type: UserBasicDto })
  user!: UserBasicDto;

  @ApiProperty({ example: 'member', enum: ['owner', 'admin', 'member'] })
  role!: string;

  @ApiProperty({ example: '2024-01-10T09:00:00.000Z' })
  joined_at!: string;
}

// Project with expanded workspace and creator
export class ExpandedProjectDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  project_id!: string;

  @ApiProperty({ example: 'Mobile App Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'iOS and Android mobile application' })
  description?: string;

  @ApiProperty({ example: 'workspace', enum: ['private', 'workspace', 'tenant'] })
  visibility!: string;

  @ApiPropertyOptional({ type: WorkspaceBasicDto })
  workspace?: WorkspaceBasicDto;

  @ApiProperty({ type: UserBasicDto })
  creator!: UserBasicDto;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T16:45:00.000Z' })
  updated_at!: string;

  @ApiPropertyOptional({ example: 15 })
  task_count?: number;

  @ApiPropertyOptional({ example: 8 })
  completed_task_count?: number;
}

// Task with expanded related objects
export class ExpandedTaskDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  task_id!: string;

  @ApiProperty({ example: 'Implement user authentication' })
  title!: string;

  @ApiPropertyOptional({ example: 'Add JWT-based authentication system with refresh tokens' })
  description?: string;

  @ApiProperty({ example: 'in_progress', enum: ['todo', 'in_progress', 'done', 'archived'] })
  status!: string;

  @ApiProperty({ example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  priority!: string;

  @ApiProperty({ type: ProjectBasicDto })
  project!: ProjectBasicDto;

  @ApiPropertyOptional({ type: UserBasicDto })
  assignee?: UserBasicDto;

  @ApiProperty({ type: UserBasicDto })
  creator!: UserBasicDto;

  @ApiPropertyOptional({ type: UserBasicDto })
  updater?: UserBasicDto;

  @ApiPropertyOptional({ example: '2024-01-20' })
  start_date?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  due_date?: string;

  @ApiPropertyOptional({ example: 16 })
  estimated_hours?: number;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        filename: { type: 'string', example: 'requirements.pdf' },
        size: { type: 'number', example: 1024000 },
        content_type: { type: 'string', example: 'application/pdf' },
        s3_key: { type: 'string', example: 'uploads/tenant/file-key' }
      }
    }
  })
  attachments!: any[];

  @ApiProperty({ example: '2024-01-10T09:15:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T14:20:00.000Z' })
  updated_at!: string;

  @ApiPropertyOptional({ example: 3 })
  comment_count?: number;
}

// Comment with expanded author and task context
export class ExpandedCommentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440004' })
  comment_id!: string;

  @ApiProperty({ example: 'This looks great! I approve these changes.' })
  text!: string;

  @ApiProperty({ type: UserBasicDto })
  author!: UserBasicDto;

  @ApiProperty({ type: TaskBasicDto })
  task!: TaskBasicDto;

  @ApiProperty({ example: '2024-01-15T11:30:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T11:35:00.000Z' })
  updated_at!: string;
}

// Workspace with expanded creator and member count
export class ExpandedWorkspaceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  workspace_id!: string;

  @ApiProperty({ example: 'Development Team' })
  name!: string;

  @ApiPropertyOptional({ example: 'Main development workspace' })
  description?: string;

  @ApiProperty({ example: false })
  is_archived!: boolean;

  @ApiProperty({ type: UserBasicDto })
  creator!: UserBasicDto;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T16:45:00.000Z' })
  updated_at!: string;

  @ApiPropertyOptional({ example: 12 })
  member_count?: number;

  @ApiPropertyOptional({ example: 5 })
  project_count?: number;
}

// Invite with expanded context
export class ExpandedInviteDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440005' })
  invite_id!: string;

  @ApiProperty({ example: 'newuser@company.com' })
  email!: string;

  @ApiProperty({ example: 'workspace', enum: ['workspace', 'project'] })
  resource_type!: string;

  @ApiProperty({ example: 'member', enum: ['owner', 'admin', 'member'] })
  role!: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'accepted', 'declined', 'expired'] })
  status!: string;

  @ApiPropertyOptional({ type: WorkspaceBasicDto })
  workspace?: WorkspaceBasicDto;

  @ApiPropertyOptional({ type: ProjectBasicDto })
  project?: ProjectBasicDto;

  @ApiProperty({ type: UserBasicDto })
  inviter!: UserBasicDto;

  @ApiProperty({ example: '2024-01-20T10:00:00.000Z' })
  expires_at!: string;

  @ApiProperty({ example: '2024-01-15T14:30:00.000Z' })
  created_at!: string;

  @ApiPropertyOptional({ example: '2024-01-16T09:15:00.000Z' })
  accepted_at?: string;
}