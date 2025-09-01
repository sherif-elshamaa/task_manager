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
  @ApiProperty()
  project_id!: string;

  @ApiProperty({ nullable: true })
  workspace_id!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: ['private', 'workspace', 'tenant'] })
  visibility!: 'private' | 'workspace' | 'tenant';

  @ApiProperty()
  created_by!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
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
