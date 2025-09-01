import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  text!: string;
}

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  text!: string;
}

export class ListCommentsQueryDto {
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
}

export class PaginatedCommentsResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: any[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class CommentResponseDto {
  @ApiProperty()
  comment_id!: string;

  @ApiProperty()
  task_id!: string;

  @ApiProperty()
  tenant_id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  created_by!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
