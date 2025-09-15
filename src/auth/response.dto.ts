import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantBasicDto } from '../shared/expanded-response.dto';

// Enhanced Response DTOs with expanded data
export class ExpandedUserSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User UUID' })
  user_id!: string;

  @ApiProperty({ example: 'user@company.com', description: 'User email address' })
  email!: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  first_name!: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  last_name!: string;

  @ApiProperty({ example: ['member'], type: [String], description: 'User roles' })
  roles!: string[];

  @ApiProperty({ example: true, description: 'Whether user account is active' })
  is_active!: boolean;

  @ApiProperty({ type: TenantBasicDto, description: 'Tenant information' })
  tenant!: TenantBasicDto;

  @ApiProperty({ example: '2024-01-01T08:00:00.000Z', description: 'Account creation date' })
  created_at!: string;

  @ApiProperty({ example: '2024-01-15T14:30:00.000Z', description: 'Last profile update' })
  updated_at!: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z', description: 'Last successful login' })
  last_login?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { preferences: { theme: 'dark', notifications: true } },
    description: 'User preferences and metadata'
  })
  metadata?: Record<string, any>;
}

// Keep legacy DTOs for backward compatibility where needed
export class UserSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User UUID' })
  user_id!: string;

  @ApiProperty({ example: 'user@company.com', description: 'User email address' })
  email!: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  first_name!: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  last_name!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Tenant UUID' })
  tenant_id!: string;

  @ApiProperty({ example: ['member'], type: [String], description: 'User roles' })
  roles!: string[];

  @ApiProperty({ example: true, description: 'Whether user account is active' })
  is_active!: boolean;
}

export class TenantSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Tenant UUID' })
  tenant_id!: string;

  @ApiProperty({ example: 'Acme Corporation', description: 'Tenant name' })
  name!: string;

  @ApiProperty({ example: 'free', enum: ['free', 'paid'], description: 'Tenant subscription plan' })
  plan!: string;

  @ApiProperty({ example: 'active', enum: ['active', 'suspended', 'deleted'], description: 'Tenant status' })
  status!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAY29tcGFueS5jb20iLCJ0ZW5hbnRfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlcyI6WyJtZW1iZXIiXSwiaWF0IjoxNTk4NTM5MjAwLCJleHAiOjE1OTg1NDAwMDB9.example',
    description: 'JWT access token'
  })
  access_token!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Refresh token UUID'
  })
  refresh_token!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiration time in seconds (15 minutes)'
  })
  expires_in!: number;

  @ApiProperty({ type: ExpandedUserSummaryDto, description: 'Authenticated user details with tenant info' })
  user!: ExpandedUserSummaryDto;
}

export class SignupResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAY29tcGFueS5jb20iLCJ0ZW5hbnRfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlcyI6WyJvd25lciJdLCJpYXQiOjE1OTg1MzkyMDAsImV4cCI6MTU5ODU0MDAwMH0.example',
    description: 'JWT access token'
  })
  access_token!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Refresh token UUID'
  })
  refresh_token!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiration time in seconds (15 minutes)'
  })
  expires_in!: number;

  @ApiProperty({ type: ExpandedUserSummaryDto, description: 'Created owner user details with tenant info' })
  user!: ExpandedUserSummaryDto;

  @ApiProperty({ type: TenantSummaryDto, description: 'Created tenant details' })
  tenant!: TenantSummaryDto;
}

export class RefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAY29tcGFueS5jb20iLCJ0ZW5hbnRfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlcyI6WyJtZW1iZXIiXSwiaWF0IjoxNTk4NTM5MjAwLCJleHAiOjE1OTg1NDAwMDB9.example',
    description: 'New JWT access token'
  })
  access_token!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'New refresh token UUID'
  })
  refresh_token!: string;

  @ApiProperty({
    example: 900,
    description: 'New access token expiration time in seconds (15 minutes)'
  })
  expires_in!: number;
}

export class MeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User UUID' })
  user_id!: string;

  @ApiProperty({ example: 'user@company.com', description: 'User email address' })
  email!: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  first_name!: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  last_name!: string;

  @ApiProperty({ example: ['member'], type: [String], description: 'User roles array' })
  roles!: string[];

  @ApiProperty({ example: true, description: 'Whether user account is active' })
  is_active!: boolean;

  @ApiProperty({ type: TenantBasicDto, description: 'Tenant information' })
  tenant!: TenantBasicDto;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z', description: 'Last successful login' })
  last_login?: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully', description: 'Success message' })
  message!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: 'If the email exists, a password reset link has been sent.', description: 'Response message' })
  message!: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: 'Password has been successfully reset. Please log in with your new password.', description: 'Success message' })
  message!: string;
}