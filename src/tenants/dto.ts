import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ enum: ['free', 'basic', 'premium', 'enterprise'] })
  @IsOptional()
  @IsEnum(['free', 'basic', 'premium', 'enterprise'])
  plan?: 'free' | 'basic' | 'premium' | 'enterprise';

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';
}

export class TenantResponseDto {
  @ApiProperty()
  tenant_id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  plan!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}

export class ListTenantsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['free', 'basic', 'premium', 'enterprise'] })
  @IsOptional()
  @IsEnum(['free', 'basic', 'premium', 'enterprise'])
  plan?: 'free' | 'basic' | 'premium' | 'enterprise';

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}

export class PaginatedTenantsResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: any[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
