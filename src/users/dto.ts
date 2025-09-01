import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['owner', 'admin', 'member'] })
  @IsEnum(['owner', 'admin', 'member'])
  role!: 'owner' | 'admin' | 'member';
}

export class ListUsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['owner', 'admin', 'member'] })
  @IsOptional()
  @IsEnum(['owner', 'admin', 'member'])
  role?: 'owner' | 'admin' | 'member';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: any[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class UserResponseDto {
  @ApiProperty()
  user_id!: string;

  @ApiProperty()
  tenant_id!: string;

  @ApiProperty()
  first_name!: string;

  @ApiProperty()
  last_name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['owner', 'admin', 'member'] })
  role!: 'owner' | 'admin' | 'member';

  @ApiProperty()
  is_active!: boolean;

  @ApiPropertyOptional()
  last_login?: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
