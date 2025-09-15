import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { WorkspaceBasicDto, UserBasicDto } from '../shared/expanded-response.dto';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name!: string;

  @ApiProperty()
  @IsUUID()
  workspace_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: ['private', 'workspace', 'tenant'],
    default: 'private',
  })
  @IsOptional()
  @IsEnum(['private', 'workspace', 'tenant'])
  visibility?: 'private' | 'workspace' | 'tenant';
}

export class ProjectResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  project_id!: string;

  @ApiProperty({ example: 'Mobile App Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'iOS and Android mobile application' })
  description?: string;

  @ApiProperty({ example: 'workspace', enum: ['private', 'workspace', 'tenant'] })
  visibility!: 'private' | 'workspace' | 'tenant';

  @ApiPropertyOptional({ type: WorkspaceBasicDto })
  workspace?: WorkspaceBasicDto;

  @ApiProperty({ type: UserBasicDto })
  creator!: UserBasicDto;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T16:45:00.000Z' })
  updated_at!: string;

  @ApiPropertyOptional({ example: 15, description: 'Total number of tasks in project' })
  task_count?: number;

  @ApiPropertyOptional({ example: 8, description: 'Number of completed tasks' })
  completed_task_count?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of high priority tasks' })
  high_priority_task_count?: number;
}

export class PaginatedProjectAdminResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  projects!: ProjectResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspace_id?: string;

  @ApiPropertyOptional({ enum: ['private', 'workspace', 'tenant'] })
  @IsOptional()
  @IsEnum(['private', 'workspace', 'tenant'])
  visibility?: 'private' | 'workspace' | 'tenant';
}

export class ListProjectsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspace_id?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['name', 'created_at'], default: 'created_at' })
  @IsOptional()
  @IsEnum(['name', 'created_at'])
  sort?: 'name' | 'created_at';
}

export class PaginatedProjectsResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: any[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
