import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @Length(1, 240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'done', 'archived'] })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done', 'archived'])
  status?: 'todo' | 'in_progress' | 'done' | 'archived';

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10080) // Max 1 week in minutes
  estimate_minutes?: number;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 240)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'done', 'archived'] })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done', 'archived'])
  status?: 'todo' | 'in_progress' | 'done' | 'archived';

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10080)
  estimate_minutes?: number;
}

export class AssignTaskDto {
  @ApiProperty()
  @IsUUID()
  assigned_to!: string;
}

export class BulkUpdateTasksDto {
  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  task_ids!: string[];

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'done', 'archived'] })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done', 'archived'])
  status?: 'todo' | 'in_progress' | 'done' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string;
}

export class TaskResponseDto {
  @ApiProperty()
  task_id!: string;

  @ApiProperty()
  project_id!: string;

  @ApiProperty()
  tenant_id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: ['todo', 'in_progress', 'done', 'archived'] })
  status!: 'todo' | 'in_progress' | 'done' | 'archived';

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] })
  priority!: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({ nullable: true })
  assigned_to?: string | null;

  @ApiPropertyOptional({
    type: 'array',
    nullable: true,
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        filename: { type: 'string' },
        size: { type: 'number' },
        mime_type: { type: 'string' },
      },
    },
  })
  attachments?: Array<{
    key: string;
    filename: string;
    size: number;
    mime_type: string;
  }> | null;

  @ApiPropertyOptional({ nullable: true })
  start_date?: string | null;

  @ApiPropertyOptional({ nullable: true })
  due_date?: string | null;

  @ApiPropertyOptional({ nullable: true })
  estimate_minutes?: number | null;

  @ApiProperty()
  created_by!: string;

  @ApiPropertyOptional({ nullable: true })
  updated_by?: string | null;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
