import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class FileUploadDto {
  @ApiProperty()
  @IsString()
  filename!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  size!: number;

  @ApiProperty()
  @IsString()
  mime_type!: string;
}

export class AttachmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  task_id!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty()
  mime_type!: string;

  @ApiProperty()
  s3_key!: string;

  @ApiProperty()
  uploaded_by!: string;

  @ApiProperty()
  created_at!: Date;
}

export class PresignedUrlRequestDto {
  @ApiProperty()
  @IsString()
  filename!: string;

  @ApiProperty()
  @IsString()
  mime_type!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  size!: number;
}

export class PresignedUrlResponseDto {
  @ApiProperty()
  upload_url!: string;

  @ApiProperty()
  s3_key!: string;

  @ApiProperty()
  expires_in!: number;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ type: 'array' })
  items!: T[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  total_pages!: number;
}
