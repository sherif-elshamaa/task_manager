import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

export class OwnerDto {
  @ApiProperty({ example: 'John', description: 'First name of the tenant owner' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the tenant owner' })
  @IsString()
  last_name!: string;

  @ApiProperty({ example: 'john.doe@company.com', description: 'Email address of the tenant owner' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password (8-128 characters)',
    minLength: 8,
    maxLength: 128
  })
  @IsString()
  @Length(8, 128)
  password!: string;
}

export class SignupDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Name of the tenant organization',
    maxLength: 255
  })
  @IsString()
  @Length(1, 255)
  tenant_name!: string;

  @ApiProperty({
    type: () => OwnerDto,
    description: 'Owner user details for the tenant'
  })
  @ValidateNested()
  @Type(() => OwnerDto)
  owner!: OwnerDto;
}

export class LoginDto {
  @ApiProperty({
    example: 'user@company.com',
    description: 'User email address'
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'MyPassword123!',
    description: 'User password'
  })
  @IsString()
  password!: string;

  @ApiProperty({
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Optional tenant ID for multi-tenant user lookup'
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class RefreshDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the refresh token'
  })
  @IsNotEmpty()
  @IsUUID()
  refresh_token!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@company.com',
    description: 'Email address to send password reset link'
  })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password (8-128 characters)',
    minLength: 8,
    maxLength: 128
  })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Password reset token from email'
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
