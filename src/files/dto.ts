import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class PresignRequestDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  contentType!: string;

  @ApiProperty({ minimum: 1, maximum: 100 * 1024 * 1024 })
  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024)
  size!: number;

  @ApiPropertyOptional({
    description: 'If provided, the uploaded file will be attached to this task',
  })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}

export class PresignResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  bucket!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}

export class ScanCallbackDto {
  @ApiProperty()
  @IsString()
  bucket!: string;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsBoolean()
  clean!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class ScanCallbackResultDto {
  @ApiProperty()
  recorded!: boolean;

  @ApiPropertyOptional()
  attachedToTask?: string;

  @ApiPropertyOptional()
  key?: string;
}
